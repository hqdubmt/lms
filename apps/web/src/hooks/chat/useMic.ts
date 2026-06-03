'use client';

import { useEffect, useRef, useState } from 'react';
import { startSTT, isSTTAvailable, type STTHandle } from '@/lib/stt';
import type { Subject } from '@/components/chat/types';

interface Options {
  subject: Subject;
  onResult: (text: string) => void;
}

export function useMic({ subject, onResult }: Options) {
  const [micListening, setMicListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const sttRef = useRef<STTHandle | null>(null);

  useEffect(() => {
    setMicAvailable(isSTTAvailable());
  }, []);

  const handleMic = () => {
    if (micListening) {
      sttRef.current?.stop();
      sttRef.current = null;
      setMicListening(false);
      return;
    }
    setMicListening(true);
    const lang = subject === 'viet' ? 'vi-VN' : subject === 'language' ? 'en-US' : 'vi-VN';
    startSTT({
      lang,
      maxSeconds: 10,
      onResult,
      onEnd: () => { setMicListening(false); sttRef.current = null; },
      onError: () => { setMicListening(false); sttRef.current = null; },
    }).then(h => { sttRef.current = h; });
  };

  return { micListening, micAvailable, handleMic };
}
