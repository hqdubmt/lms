'use client';

import { useState } from 'react';
import { Volume2, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePronunciation } from '@/hooks/usePronunciation';
import { IpaGuideModal } from './IpaGuideModal';

interface PronunciationCardProps {
  initialText?: string;
  className?: string;
}

export function PronunciationCard({ initialText = '', className }: PronunciationCardProps) {
  const [input, setInput] = useState(initialText);
  const [showGuide, setShowGuide] = useState(false);
  const { result, loading, error, analyze } = usePronunciation();

  const handleAnalyze = () => analyze(input);

  const handleTts = () => {
    if (!input.trim()) return;
    const url = `/api/language/tts?text=${encodeURIComponent(input)}&lang=en-US`;
    new Audio(url).play().catch(() => {});
  };

  return (
    <div className={cn('rounded-xl border border-blue-100 bg-white shadow-sm p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
          <Volume2 className="h-4 w-4" />
          Phát âm
        </h3>
        <button
          onClick={() => setShowGuide(true)}
          className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
        >
          <BookOpen className="h-3 w-3" />
          Bảng IPA
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          placeholder="Nhập từ hoặc câu tiếng Anh..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleTts}
          className="px-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          title="Nghe phát âm"
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Phân tích'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {result && (
        <div className="space-y-2 text-sm">
          <div className="bg-blue-50 rounded-lg px-3 py-2">
            <span className="text-xs text-blue-500 font-medium">IPA</span>
            <p className="font-mono text-lg text-blue-800 mt-0.5">{result.ipa}</p>
          </div>

          {result.stress && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Trọng âm</span>
              <span className="font-semibold text-gray-700">{result.stress}</span>
            </div>
          )}

          {result.syllables && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Âm tiết</span>
              <span className="text-gray-600">{result.syllables}</span>
            </div>
          )}

          {result.vietnameseHint && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Đọc gần</span>
              <span className="text-orange-600 font-medium">{result.vietnameseHint}</span>
            </div>
          )}

          {result.linking && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Nối âm</span>
              <span className="text-gray-600">{result.linking}</span>
            </div>
          )}

          {result.reduction && (
            <div className="flex gap-2 items-start">
              <span className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">Giảm âm</span>
              <span className="text-gray-600">{result.reduction}</span>
            </div>
          )}

          {result.commonMistakes && result.commonMistakes.length > 0 && (
            <div className="bg-orange-50 rounded-lg px-3 py-2">
              <span className="text-xs text-orange-500 font-medium">Lỗi thường gặp</span>
              <ul className="mt-1 space-y-0.5">
                {result.commonMistakes.map((m, i) => (
                  <li key={i} className="text-xs text-orange-700">• {m}</li>
                ))}
              </ul>
            </div>
          )}

          {result.tips.length > 0 && (
            <div className="bg-green-50 rounded-lg px-3 py-2">
              <span className="text-xs text-green-600 font-medium">Mẹo</span>
              <ul className="mt-1 space-y-0.5">
                {result.tips.map((t, i) => (
                  <li key={i} className="text-xs text-green-700">• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showGuide && <IpaGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
