import { Worker, Job } from 'bullmq';
import { createBullMQConnection } from '../services/redis';
import { minioClient } from '../services/minio';
import { prisma } from '../services/prisma';
import { env } from '../config/env';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Readable } from 'stream';

export interface VideoJob {
  lessonId: string;
  videoKey: string;
  bucket: string;
  mimetype?: string;
}

// Quality presets for HLS transcoding
const QUALITY_PRESETS = [
  { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k' },
  { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
  { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
];

function streamToFile(stream: Readable, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    stream.pipe(file);
    file.on('finish', resolve);
    file.on('error', reject);
    stream.on('error', reject);
  });
}

function probeVideo(inputPath: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      const duration = Math.round(data.format.duration || 0);
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      resolve({ duration, width, height });
    });
  });
}

function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  preset: (typeof QUALITY_PRESETS)[0],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const playlistPath = join(outputDir, preset.name, 'playlist.m3u8');
    const segmentPattern = join(outputDir, preset.name, 'seg_%04d.ts');

    mkdirSync(join(outputDir, preset.name), { recursive: true });

    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOption('-vf', `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`)
      .addOption('-b:v', preset.videoBitrate)
      .addOption('-b:a', preset.audioBitrate)
      .addOption('-hls_time', '6')
      .addOption('-hls_list_size', '0')
      .addOption('-hls_segment_filename', segmentPattern)
      .addOption('-preset', 'fast')
      .addOption('-crf', '23')
      .addOption('-movflags', '+faststart')
      .format('hls')
      .output(playlistPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function buildMasterPlaylist(presets: (typeof QUALITY_PRESETS)[0][]): string {
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n';
  for (const p of presets) {
    const bw = parseInt(p.videoBitrate) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${p.width}x${p.height}\n`;
    content += `${p.name}/playlist.m3u8\n`;
  }
  return content;
}

async function uploadHLSToMinio(localDir: string, minioPrefix: string, bucket: string) {
  const walk = (dir: string): string[] => {
    const entries = readdirSync(dir);
    const files: string[] = [];
    for (const entry of entries) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) files.push(...walk(full));
      else files.push(full);
    }
    return files;
  };

  const files = walk(localDir);
  await Promise.all(
    files.map(async (file) => {
      const relative = file.replace(localDir + '/', '');
      const minioKey = `${minioPrefix}/${relative}`;
      const ext = file.split('.').pop() || '';
      const contentType = ext === 'm3u8'
        ? 'application/x-mpegURL'
        : ext === 'ts'
          ? 'video/mp2t'
          : 'application/octet-stream';

      await minioClient.fPutObject(bucket, minioKey, file, { 'Content-Type': contentType });
    }),
  );
}

async function processVideoJob(job: Job<VideoJob>) {
  const { lessonId, videoKey, bucket } = job.data;
  const workDir = join(tmpdir(), `lms-video-${lessonId}-${Date.now()}`);

  try {
    console.log(`[video-worker] Processing lesson ${lessonId}, key: ${videoKey}`);
    await job.updateProgress(5);

    // Update lesson status
    await prisma.lesson.update({ where: { id: lessonId }, data: { isPublished: false } });

    // 1. Download original from MinIO
    mkdirSync(workDir, { recursive: true });
    const ext = videoKey.split('.').pop()?.toLowerCase() || 'mp4';
    const inputPath = join(workDir, `input.${ext}`);
    const stream = await minioClient.getObject(bucket, videoKey);
    await streamToFile(stream as any, inputPath);
    await job.updateProgress(20);

    // 2. Probe video metadata
    const { duration, width, height } = await probeVideo(inputPath);
    console.log(`[video-worker] Video: ${width}x${height}, ${duration}s`);
    await job.updateProgress(25);

    // 3. Select quality presets based on input resolution
    const applicablePresets = QUALITY_PRESETS.filter(
      (p) => p.height <= height || p.name === '360p',
    );

    // 4. Transcode each quality
    const hlsDir = join(workDir, 'hls');
    mkdirSync(hlsDir, { recursive: true });

    const progressPerPreset = 50 / applicablePresets.length;
    for (let i = 0; i < applicablePresets.length; i++) {
      const preset = applicablePresets[i];
      console.log(`[video-worker] Transcoding ${preset.name}...`);
      await transcodeToHLS(inputPath, hlsDir, preset);
      await job.updateProgress(25 + Math.round(progressPerPreset * (i + 1)));
    }

    // 5. Create master playlist
    const masterContent = buildMasterPlaylist(applicablePresets);
    const masterPath = join(hlsDir, 'master.m3u8');
    require('fs').writeFileSync(masterPath, masterContent);
    await job.updateProgress(80);

    // 6. Upload all HLS files to MinIO
    const hlsPrefix = `lessons/${lessonId}/hls`;
    await uploadHLSToMinio(hlsDir, hlsPrefix, env.MINIO_BUCKET_VIDEOS);
    await job.updateProgress(95);

    // 7. Update lesson record
    const hlsKey = `${hlsPrefix}/master.m3u8`;
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        videoHlsKey: hlsKey,
        videoDuration: duration,
        isPublished: true,
      },
    });

    await job.updateProgress(100);
    console.log(`[video-worker] Done. HLS key: ${hlsKey}`);
    return { hlsKey, duration };
  } finally {
    // Cleanup temp dir
    if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  }
}

export const videoWorker = new Worker<VideoJob>(
  'video',
  processVideoJob,
  {
    connection: createBullMQConnection(),
    concurrency: 2,
  },
);

videoWorker.on('completed', (job) => {
  console.log(`[video-worker] Job ${job.id} completed`);
});

videoWorker.on('failed', (job, err) => {
  console.error(`[video-worker] Job ${job?.id} failed:`, err.message);
  if (job?.data?.lessonId) {
    prisma.lesson.update({
      where: { id: job.data.lessonId },
      data: { isPublished: false },
    }).catch(() => {});
  }
});

videoWorker.on('progress', (job, progress) => {
  console.log(`[video-worker] Job ${job.id} progress: ${progress}%`);
});
