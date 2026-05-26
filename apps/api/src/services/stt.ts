// Server-side STT using OpenAI Whisper API
export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string,
  lang?: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const ext = mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('wav') ? 'wav'
    : mimeType.includes('mp3') ? 'mp3'
    : 'webm';

  const form = new FormData();
  form.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  if (lang) form.append('language', lang.slice(0, 2));

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json() as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
