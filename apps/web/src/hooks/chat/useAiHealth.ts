'use client';

import { useEffect, useState } from 'react';

export function useAiHealth() {
  const [aiOk, setAiOk] = useState<boolean | null>(null);
  const [aiLabel, setAiLabel] = useState('');

  useEffect(() => {
    fetch('/api/ai/health')
      .then(r => r.json())
      .then(d => {
        setAiOk(d.available);
        const names: Record<string, string> = {
          groq:   'Groq · llama-3.3-70b',
          gemini: 'Gemini · Flash 2.0',
          ollama: d.model || 'Ollama',
        };
        setAiLabel(d.provider ? (names[d.provider] ?? d.model ?? '') : '');
      })
      .catch(() => setAiOk(false));
  }, []);

  return { aiOk, aiLabel };
}
