// Shared STT utility:
// 1. Web Speech API (browser / Electron with secure context)
// 2. MediaRecorder → server OpenAI Whisper fallback (Android / HTTP context)

export interface STTOptions {
  lang: string;          // BCP-47 e.g. 'en-US', 'vi-VN'
  maxSeconds?: number;   // max recording duration for MediaRecorder fallback (default 8)
  onStart?: () => void;
  onResult: (transcript: string) => void;
  onEnd: () => void;
  onError?: (err: string) => void;
}

export interface STTHandle {
  stop: () => void;
}

function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// MediaRecorder fallback — records audio then sends to server Whisper
async function startMediaRecorderSTT(opts: STTOptions): Promise<STTHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
    ? 'audio/ogg;codecs=opus'
    : 'audio/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  let stopped = false;

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    if (stopped && chunks.length === 0) { opts.onEnd(); return; }
    const blob = new Blob(chunks, { type: mimeType });
    try {
      const form = new FormData();
      form.append('audio', blob, 'rec.webm');
      const langCode = opts.lang.slice(0, 2);
      const res = await fetch(`/api/ai/stt?lang=${langCode}`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      const json = await res.json();
      if (json.transcript) opts.onResult(json.transcript);
      else opts.onError?.('Không nhận ra giọng nói');
    } catch {
      opts.onError?.('Lỗi kết nối STT');
    }
    opts.onEnd();
  };

  const maxSec = opts.maxSeconds ?? 8;
  const autoStop = setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop();
  }, maxSec * 1000);

  recorder.start();
  opts.onStart?.();

  return {
    stop: () => {
      clearTimeout(autoStop);
      stopped = true;
      if (recorder.state === 'recording') recorder.stop();
    },
  };
}

// Web Speech API
function startWebSpeechSTT(opts: STTOptions): STTHandle {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let handled = false;

  rec.onresult = (e: any) => {
    if (handled) return;
    handled = true;
    const transcript = e.results[0][0].transcript;
    opts.onResult(transcript);
    opts.onEnd();
  };
  rec.onerror = (e: any) => {
    if (handled) return;
    handled = true;
    opts.onError?.(e.error || 'lỗi mic');
    opts.onEnd();
  };
  rec.onend = () => {
    if (!handled) { handled = true; opts.onEnd(); }
  };

  rec.start();
  opts.onStart?.();

  return { stop: () => { try { rec.stop(); } catch {} } };
}

// Main entry — picks the right method automatically
export async function startSTT(opts: STTOptions): Promise<STTHandle> {
  if (hasWebSpeech()) {
    return startWebSpeechSTT(opts);
  }
  // Mobile / insecure context → server-side Whisper
  try {
    return await startMediaRecorderSTT(opts);
  } catch (err: any) {
    opts.onError?.(err?.message || 'Không thể dùng micro');
    opts.onEnd();
    return { stop: () => {} };
  }
}

// Synchronous check: can we do STT at all?
export function isSTTAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasWebSpeech()) return true;
  return !!(navigator.mediaDevices && typeof MediaRecorder !== 'undefined');
}
