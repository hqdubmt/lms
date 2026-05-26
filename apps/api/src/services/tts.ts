import { spawn } from 'child_process';

const LANG_MAP: Record<string, string> = {
  'en': 'en', 'en-us': 'en-us', 'en-gb': 'en-gb',
  'vi': 'vi', 'vi-vn': 'vi',
  'fr': 'fr', 'fr-fr': 'fr',
  'de': 'de', 'de-de': 'de',
  'es': 'es', 'es-es': 'es', 'es-mx': 'es-mx',
  'ja': 'ja', 'ja-jp': 'ja',
  'zh': 'zh', 'zh-cn': 'zh', 'zh-tw': 'zh-tw',
  'ko': 'ko', 'ko-kr': 'ko',
  'ru': 'ru', 'ru-ru': 'ru',
  'it': 'it', 'it-it': 'it',
  'pt': 'pt', 'pt-br': 'pt-br', 'pt-pt': 'pt',
  'ar': 'ar', 'th': 'th', 'hi': 'hi',
};

export function toEspeakVoice(lang: string): string {
  const base = lang.toLowerCase().replace('_', '-');
  return LANG_MAP[base] ?? LANG_MAP[base.split('-')[0]] ?? 'en';
}

export function espeakTTS(text: string, voice: string, speed = 140): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const proc = spawn('espeak-ng', ['-v', voice, '-s', String(speed), '--stdout', text]);
    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`espeak-ng exited ${code}`));
    });
    proc.on('error', reject);
  });
}

export async function serveTTS(
  text: string,
  lang: string,
  slow = false,
): Promise<{ audio: Buffer; contentType: string } | null> {
  const safeText = String(text).slice(0, 200);
  const speed = slow ? 80 : 140;

  // Try Google Translate TTS first
  try {
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=gtx`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MasterLMS/1.0)' },
    });
    if (res.ok) {
      return { audio: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
    }
  } catch {
    // fall through to espeak-ng
  }

  // Fallback: espeak-ng (offline)
  try {
    const voice = toEspeakVoice(lang);
    const audio = await espeakTTS(safeText, voice, speed);
    return { audio, contentType: 'audio/wav' };
  } catch {
    return null;
  }
}
