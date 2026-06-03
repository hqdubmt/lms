'use client';

import { useCallback, useRef, useState } from 'react';
import { startSTT, isSTTAvailable, type STTHandle } from '@/lib/stt';
import type { Subject, Message } from '@/components/chat/types';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Options {
  subject: Subject;
  onTranscript: (text: string) => void;
  messages: Message[];
}

export function useVoiceConversation({ subject, onTranscript, messages }: Options) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const sttRef = useRef<STTHandle | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const available = isSTTAvailable();

  const lang = subject === 'language' ? 'en-US' : 'vi-VN';

  const stopAll = useCallback(() => {
    sttRef.current?.stop();
    sttRef.current = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    synthRef.current = null;
    setVoiceState('idle');
  }, []);

  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    // Strip markdown for TTS
    const cleaned = text
      .replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '')
      .replace(/`[^`]+`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 500);

    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.lang = lang;
    utt.rate = 0.95;
    utt.onend = () => { setVoiceState('idle'); onDone?.(); };
    utt.onerror = () => { setVoiceState('idle'); onDone?.(); };
    synthRef.current = utt;
    setVoiceState('speaking');
    window.speechSynthesis.speak(utt);
  }, [lang]);

  const startListening = useCallback(async () => {
    if (voiceState !== 'idle') { stopAll(); return; }
    setVoiceState('listening');

    let gotResult = false;
    const handle = await startSTT({
      lang,
      maxSeconds: 12,
      onResult: (text) => {
        gotResult = true;
        setLastTranscript(text);
        setVoiceState('thinking');
        onTranscript(text);
      },
      onEnd: () => {
        sttRef.current = null;
        if (!gotResult) setVoiceState('idle');
      },
      onError: () => { sttRef.current = null; setVoiceState('idle'); },
    });
    sttRef.current = handle;
  }, [voiceState, lang, onTranscript, stopAll]);

  // Called by parent when AI response arrives → auto-speak
  const onAiResponse = useCallback((text: string) => {
    setVoiceState('speaking');
    speakText(text);
  }, [speakText]);

  return {
    voiceState,
    lastTranscript,
    available,
    startListening,
    stopAll,
    onAiResponse,
    speakText,
  };
}
