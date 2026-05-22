import { Client } from 'minio';
import { env } from '../config/env';

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export async function initMinioBuckets() {
  const buckets = [
    env.MINIO_BUCKET_VIDEOS,
    env.MINIO_BUCKET_ATTACHMENTS,
    env.MINIO_BUCKET_AVATARS,
    env.MINIO_BUCKET_MEDIA,
  ];

  for (const bucket of buckets) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'ap-southeast-1');
      console.log(`MinIO bucket created: ${bucket}`);
    }
  }
}

export async function getSignedUrl(bucket: string, key: string, expiry = 3600) {
  return minioClient.presignedGetObject(bucket, key, expiry);
}

export async function getUploadUrl(bucket: string, key: string, expiry = 3600) {
  return minioClient.presignedPutObject(bucket, key, expiry);
}

export async function deleteObject(bucket: string, key: string) {
  return minioClient.removeObject(bucket, key);
}
