'use client';

import { useCallback, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function TtsButton({ text, lang }: { text: string; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = useCallback(() => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.95;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setPlaying(true);
  }, [playing, text, lang]);

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  return (
    <button
      onClick={toggle}
      className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
      title={playing ? 'Dừng đọc' : 'Nghe đọc'}
    >
      {playing
        ? <VolumeX className="h-3.5 w-3.5 text-primary" />
        : <Volume2 className="h-3.5 w-3.5" />}
    </button>
  );
}
