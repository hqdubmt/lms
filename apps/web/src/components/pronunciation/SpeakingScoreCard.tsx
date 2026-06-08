'use client';

import { useState } from 'react';
import { Mic, MicOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePronunciation } from '@/hooks/usePronunciation';

interface SpeakingScoreCardProps {
  expectedText?: string;
  spokenText?: string;
  className?: string;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? 'text-green-600' : score >= 60 ? 'text-yellow-500' : 'text-red-500';
  const bg = score >= 85 ? 'bg-green-50' : score >= 60 ? 'bg-yellow-50' : 'bg-red-50';
  return (
    <div className={cn('rounded-full h-16 w-16 flex flex-col items-center justify-center', bg)}>
      <span className={cn('text-2xl font-bold', color)}>{score}</span>
      <span className="text-[10px] text-gray-400">/ 100</span>
    </div>
  );
}

export function SpeakingScoreCard({ expectedText = '', spokenText = '', className }: SpeakingScoreCardProps) {
  const [expected, setExpected] = useState(expectedText);
  const [spoken, setSpoken] = useState(spokenText);
  const { scoreResult, loading, error, scoreSpoken } = usePronunciation();

  const handleScore = () => scoreSpoken(expected, spoken);

  return (
    <div className={cn('rounded-xl border border-purple-100 bg-white shadow-sm p-4 space-y-3', className)}>
      <div className="flex items-center gap-1.5">
        <Mic className="h-4 w-4 text-purple-600" />
        <h3 className="text-sm font-semibold text-purple-700">Điểm phát âm</h3>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Câu mẫu (expected)</label>
          <input
            value={expected}
            onChange={e => setExpected(e.target.value)}
            placeholder="Nhập câu tiếng Anh cần luyện..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Bạn đã nói (spoken)</label>
          <input
            value={spoken}
            onChange={e => setSpoken(e.target.value)}
            placeholder="Transcript từ nhận diện giọng nói..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      <button
        onClick={handleScore}
        disabled={loading || !expected.trim() || !spoken.trim()}
        className="w-full py-2 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
        Chấm điểm
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {scoreResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <ScoreRing score={scoreResult.score} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">
                {scoreResult.score >= 85 ? 'Xuất sắc!' : scoreResult.score >= 60 ? 'Khá tốt!' : 'Cần luyện thêm'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {scoreResult.mistakes.length === 0 ? 'Không có lỗi nào' : `${scoreResult.mistakes.length} từ cần chú ý`}
              </p>
            </div>
          </div>

          {scoreResult.mistakes.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-red-600">Từ sai</span>
              {scoreResult.mistakes.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-1.5 text-xs">
                  <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="text-red-700">
                    Vị trí {m.position + 1}: mong đợi <strong>{m.expected}</strong>, bạn nói <strong>{m.spoken}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {scoreResult.tips.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-green-600">Gợi ý</span>
              {scoreResult.tips.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
