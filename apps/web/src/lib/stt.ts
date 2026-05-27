// Shared STT utility
// Priority:
//   1. MediaRecorder → OpenAI Whisper (works everywhere: Android WebView, Electron, browser)
//   2. Web Speech API fallback (Chrome browser on HTTPS only — kept as option)
import { api } from '@/lib/api';

export interface STTOptions {
  lang: string;          // BCP-47 e.g. 'en-US', 'vi-VN'
  maxSeconds?: number;   // max recording time before auto-stop (default 8)
  onStart?: () => void;
  onResult: (transcript: string) => void;
  onEnd: () => void;
  onError?: (err: string) => void;
}

export interface STTHandle {
  stop: () => void;
}

function hasMediaRecorder(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (navigator as any).mediaDevices?.getUserMedia &&
    (window as any).MediaRecorder
  );
}

function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

// ── MediaRecorder → Whisper ───────────────────────────────────────────────────
async function startMediaRecorderSTT(opts: STTOptions): Promise<STTHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
    ? 'audio/ogg;codecs=opus'
    : 'audio/webm';

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  recorder.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    if (chunks.length === 0) { opts.onEnd(); return; }

    const blob = new Blob(chunks, { type: mimeType });
    try {
      const form = new FormData();
      form.append('audio', blob, 'rec.webm');
      const langCode = opts.lang.slice(0, 2);
      // api.upload() automatically includes Authorization Bearer header
      const json = await api.upload<{ transcript?: string }>(`/ai/stt?lang=${langCode}`, form);
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

  recorder.start(250); // collect data every 250ms
  opts.onStart?.();

  return {
    stop: () => {
      clearTimeout(autoStop);
      if (recorder.state === 'recording') recorder.stop();
    },
  };
}

// ── Web Speech API (browser/HTTPS only) ───────────────────────────────────────
function startWebSpeechSTT(opts: STTOptions, fallback: () => Promise<STTHandle>): STTHandle {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let handled = false;
  let handle: STTHandle = { stop: () => { try { rec.stop(); } catch {} } };

  rec.onresult = (e: any) => {
    if (handled) return;
    handled = true;
    opts.onResult(e.results[0][0].transcript);
    opts.onEnd();
  };

  rec.onerror = async (e: any) => {
    if (handled) return;
    handled = true;
    // Errors that mean "unavailable" → fall back to MediaRecorder/Whisper
    const fallbackErrors = ['not-allowed', 'service-not-allowed', 'network', 'audio-capture', 'aborted'];
    if (fallbackErrors.includes(e.error) && hasMediaRecorder()) {
      try {
        handle = await fallback();
        return;
      } catch { /* fall through */ }
    }
    opts.onError?.(e.error || 'lỗi mic');
    opts.onEnd();
  };

  rec.onend = () => {
    if (!handled) { handled = true; opts.onEnd(); }
  };

  try {
    rec.start();
    opts.onStart?.();
  } catch {
    // Synchronous throw (e.g. insecure context) → use MediaRecorder immediately
    if (hasMediaRecorder()) {
      fallback().then(h => { handle = h; });
    } else {
      opts.onError?.('Mic không khả dụng');
      opts.onEnd();
    }
  }

  return { stop: () => handle.stop() };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function startSTT(opts: STTOptions): Promise<STTHandle> {
  // Always try MediaRecorder first on mobile / non-HTTPS environments
  // Use Web Speech API only when we're in a secure browser context (HTTPS)
  const isSecure = typeof window !== 'undefined' && window.isSecureContext;
  const preferWebSpeech = isSecure && hasWebSpeech() && !hasMediaRecorder();

  if (preferWebSpeech) {
    const fallback = () => startMediaRecorderSTT(opts);
    return startWebSpeechSTT(opts, fallback);
  }

  if (hasMediaRecorder()) {
    try {
      return await startMediaRecorderSTT(opts);
    } catch (err: any) {
      // getUserMedia denied → try Web Speech as last resort
      if (hasWebSpeech()) {
        const noFallback = () => Promise.resolve({ stop: () => {} } as STTHandle);
        return startWebSpeechSTT(opts, noFallback);
      }
      opts.onError?.(err?.message || 'Không thể dùng micro');
      opts.onEnd();
      return { stop: () => {} };
    }
  }

  if (hasWebSpeech()) {
    const fallback = () => startMediaRecorderSTT(opts);
    return startWebSpeechSTT(opts, fallback);
  }

  opts.onError?.('Thiết bị không hỗ trợ micro');
  opts.onEnd();
  return { stop: () => {} };
}

export function isSTTAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return hasMediaRecorder() || hasWebSpeech();
}
