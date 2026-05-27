// Shared STT utility — 3 strategies, in priority order:
//
//  1. postMessage bridge  — when inside a cross-origin iframe (mobile wrapper)
//     The outer wrapper page (secure context) handles recording and returns transcript
//
//  2. Web Speech API       — when in secure context with SpeechRecognition available
//     Electron (unsafely-treat-insecure-origin-as-secure + disable-web-security)
//     Chrome/Firefox on HTTPS
//
//  3. MediaRecorder → server Whisper — general fallback (requires valid OPENAI_API_KEY)
//
import { api } from '@/lib/api';

export interface STTOptions {
  lang: string;          // BCP-47 e.g. 'en-US', 'vi-VN'
  maxSeconds?: number;
  onStart?: () => void;
  onResult: (transcript: string) => void;
  onEnd: () => void;
  onError?: (err: string) => void;
}

export interface STTHandle {
  stop: () => void;
}

const isInIframe = () =>
  typeof window !== 'undefined' && window !== window.top;

function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

function hasMediaRecorder(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (navigator as any).mediaDevices?.getUserMedia &&
    (window as any).MediaRecorder
  );
}

// ── 1. postMessage bridge (inside iframe → parent wrapper handles mic) ────────
function startBridgeSTT(opts: STTOptions): STTHandle {
  let done = false;

  const onMsg = (e: MessageEvent) => {
    const d = e.data;
    if (!d || d.type !== 'STT_RESULT') return;
    if (done) return;
    done = true;
    window.removeEventListener('message', onMsg);
    clearTimeout(timeout);
    if (d.transcript) opts.onResult(d.transcript);
    else opts.onError?.(d.error || 'Không nhận ra giọng nói');
    opts.onEnd();
  };

  const maxSec = opts.maxSeconds ?? 8;
  const timeout = setTimeout(() => {
    if (done) return;
    done = true;
    window.removeEventListener('message', onMsg);
    try { window.parent.postMessage({ type: 'STT_STOP' }, '*'); } catch {}
    opts.onError?.('Hết thời gian ghi âm');
    opts.onEnd();
  }, (maxSec + 3) * 1000);

  window.addEventListener('message', onMsg);
  try { window.parent.postMessage({ type: 'STT_START', lang: opts.lang, maxSeconds: maxSec }, '*'); } catch {}
  opts.onStart?.();

  return {
    stop: () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      window.removeEventListener('message', onMsg);
      try { window.parent.postMessage({ type: 'STT_STOP' }, '*'); } catch {}
    },
  };
}

// ── 2. Web Speech API ─────────────────────────────────────────────────────────
function startWebSpeechSTT(
  opts: STTOptions,
  onFail: () => void,
): STTHandle {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let handled = false;
  const finish = (transcript?: string) => {
    if (handled) return;
    handled = true;
    if (transcript) { opts.onResult(transcript); opts.onEnd(); }
    else { onFail(); }
  };

  rec.onresult = (e: any) => finish(e.results[0][0].transcript);
  rec.onerror = () => finish();
  rec.onend = () => { if (!handled) finish(); };

  try {
    rec.start();
    opts.onStart?.();
  } catch {
    onFail();
  }

  return { stop: () => { try { rec.stop(); } catch {} } };
}

// ── 3. MediaRecorder → server Whisper ────────────────────────────────────────
async function startMediaRecorderSTT(opts: STTOptions): Promise<STTHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = (window as any).MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  const recorder = new (window as any).MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e: any) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = async () => {
    stream.getTracks().forEach((t: any) => t.stop());
    if (chunks.length === 0) { opts.onEnd(); return; }
    const blob = new Blob(chunks, { type: mimeType });
    try {
      const form = new FormData();
      form.append('audio', blob, 'rec.webm');
      const json = await api.upload<{ transcript?: string }>(`/ai/stt?lang=${opts.lang.slice(0, 2)}`, form);
      if (json.transcript) opts.onResult(json.transcript);
      else opts.onError?.('Không nhận ra giọng nói');
    } catch {
      opts.onError?.('Server STT không khả dụng');
    }
    opts.onEnd();
  };

  const auto = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, (opts.maxSeconds ?? 8) * 1000);
  recorder.start(250);
  opts.onStart?.();
  return { stop: () => { clearTimeout(auto); if (recorder.state === 'recording') recorder.stop(); } };
}

// ── Public entry ──────────────────────────────────────────────────────────────
export async function startSTT(opts: STTOptions): Promise<STTHandle> {
  // Inside mobile/desktop iframe wrapper → use postMessage bridge
  if (isInIframe()) {
    return startBridgeSTT(opts);
  }

  // Secure context with Web Speech API (Electron, HTTPS browser)
  if (hasWebSpeech() && window.isSecureContext) {
    return new Promise<STTHandle>((resolve) => {
      let handle: STTHandle;
      const onFail = async () => {
        // Web Speech failed → try MediaRecorder fallback
        if (hasMediaRecorder()) {
          handle = await startMediaRecorderSTT(opts).catch(() => ({ stop: () => {} }));
        } else {
          opts.onError?.('Mic không khả dụng');
          opts.onEnd();
          handle = { stop: () => {} };
        }
      };
      handle = startWebSpeechSTT(opts, onFail);
      resolve({ stop: () => handle.stop() });
    });
  }

  // No iframe, no Web Speech → MediaRecorder → Whisper
  if (hasMediaRecorder()) {
    return startMediaRecorderSTT(opts).catch(() => {
      opts.onError?.('Không thể truy cập micro');
      opts.onEnd();
      return { stop: () => {} };
    });
  }

  opts.onError?.('Thiết bị không hỗ trợ ghi âm');
  opts.onEnd();
  return { stop: () => {} };
}

export function isSTTAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return isInIframe() || hasWebSpeech() || hasMediaRecorder();
}
