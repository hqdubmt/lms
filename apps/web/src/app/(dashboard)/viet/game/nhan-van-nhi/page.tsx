'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PenLine, Trophy, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface GradeResult {
  chinhTa: number;
  nguPhap: number;
  yTuong: number;
  dienDat: number;
  nhanXet: string;
  goiY: string;
  total: number;
  xpEarned: number;
}

type GameState = 'idle' | 'writing' | 'grading' | 'done';

const CRITERIA = [
  { key: 'chinhTa', label: 'Chính tả', color: 'bg-blue-500', desc: 'dấu hỏi/ngã, ch/tr, s/x' },
  { key: 'nguPhap', label: 'Ngữ pháp', color: 'bg-violet-500', desc: 'cấu trúc câu' },
  { key: 'yTuong', label: 'Ý tưởng', color: 'bg-emerald-500', desc: 'nội dung & ý nghĩa' },
  { key: 'dienDat', label: 'Diễn đạt', color: 'bg-rose-500', desc: 'văn phong & lưu loát' },
] as const;

const MIN_WORDS = 30;

export default function NhanVanNhiPage() {
  const [state, setState] = useState<GameState>('idle');
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const loadTopics = async () => {
    setLoadingTopics(true);
    try {
      const data = await api.get<{ topics: string[] }>('/viet/game/nhan-van-nhi/topics');
      setTopics(data.topics);
      setTopic(data.topics[0] ?? '');
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => { loadTopics(); }, []);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (wordCount < MIN_WORDS) return;
    setState('grading');
    try {
      const res = await api.post<GradeResult>('/viet/game/nhan-van-nhi/grade', { topic, text });
      setResult(res);
      setState('done');
    } catch {
      setState('writing');
      alert('Không thể chấm bài. Thử lại.');
    }
  };

  const handleRetry = async () => {
    setText('');
    setResult(null);
    setState('writing');
    await loadTopics();
    setState('idle');
  };

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/viet" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Tiếng Việt
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 p-8 text-white text-center shadow-xl">
          <PenLine className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Nhà Văn Nhí</h1>
          <p className="text-white/80 mt-1">Viết đoạn văn — AI chấm điểm chuyên nghiệp!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-4 bg-white">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Chọn chủ đề</label>
              <button onClick={loadTopics} disabled={loadingTopics}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <RefreshCw className={cn('w-3.5 h-3.5', loadingTopics && 'animate-spin')} />
                Chủ đề khác
              </button>
            </div>
            {topics.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {topics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className={cn('py-2.5 px-3 rounded-xl border-2 text-sm font-medium text-left transition',
                      topic === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            )}
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ Viết tối thiểu {MIN_WORDS} từ</p>
            <p>✦ AI chấm 4 tiêu chí: Chính tả, Ngữ pháp, Ý tưởng, Diễn đạt</p>
            <p>✦ Điểm cao → nhiều XP hơn</p>
          </div>
          <button onClick={() => setState('writing')} disabled={!topic}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition disabled:opacity-50">
            Bắt đầu viết!
          </button>
        </div>
      </div>
    );
  }

  if (state === 'writing') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <Link href="/viet" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Tiếng Việt
        </Link>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Chủ đề hôm nay</p>
          <h2 className="text-2xl font-black text-gray-800">{topic}</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Đoạn văn của bạn</label>
            <span className={cn('text-sm', wordCount >= MIN_WORDS ? 'text-green-600 font-semibold' : 'text-gray-400')}>
              {wordCount} / {MIN_WORDS}+ từ
            </span>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Hãy viết đoạn văn về chủ đề "${topic}"...`}
            rows={12}
            autoFocus
            className="w-full rounded-xl border-2 border-gray-200 p-4 text-base focus:outline-none focus:border-orange-400 resize-none leading-relaxed"
          />
        </div>

        {wordCount < MIN_WORDS && wordCount > 0 && (
          <p className="text-sm text-amber-600">Viết thêm {MIN_WORDS - wordCount} từ nữa để nộp bài.</p>
        )}

        <button onClick={handleSubmit} disabled={wordCount < MIN_WORDS}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition disabled:opacity-50">
          Nộp bài để AI chấm →
        </button>
      </div>
    );
  }

  if (state === 'grading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
        <p className="text-base font-medium text-gray-700">AI đang chấm bài...</p>
        <p className="text-sm text-gray-400">Quá trình có thể mất vài giây</p>
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <Link href="/viet" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Tiếng Việt
        </Link>

        {/* Score card */}
        <div className={cn('rounded-2xl p-6 text-white text-center shadow-xl',
          result.total >= 80 ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
          : result.total >= 60 ? 'bg-gradient-to-br from-amber-500 to-orange-600'
          : 'bg-gradient-to-br from-gray-500 to-gray-700')}>
          <Trophy className="w-12 h-12 mx-auto mb-2" />
          <div className="text-5xl font-black">{result.total}</div>
          <p className="text-white/80 mt-1">Tổng điểm / 100</p>
          <p className="text-white/70 text-sm mt-1">Chủ đề: {topic} · +{result.xpEarned} XP</p>
        </div>

        {/* Criteria breakdown */}
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <h3 className="font-bold text-gray-800">Chi tiết từng tiêu chí</h3>
          {CRITERIA.map(c => {
            const val = result[c.key as keyof typeof result] as number;
            return (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">{c.label}</span>
                    <span className="text-gray-400 ml-1.5 text-xs">{c.desc}</span>
                  </div>
                  <span className="font-bold text-gray-800">{val}<span className="text-gray-400 font-normal">/25</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className={cn('h-2 rounded-full transition-all', c.color)} style={{ width: `${(val / 25) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        <div className="rounded-2xl border bg-white p-5 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Nhận xét</p>
              <p className="text-sm text-gray-600">{result.nhanXet}</p>
            </div>
          </div>
          {result.goiY && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-amber-600 mb-1">Gợi ý cải thiện</p>
              <p className="text-sm text-gray-600">{result.goiY}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition">
            Viết lại
          </button>
          <Link href="/viet" className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition text-center text-gray-700">
            Về trang Tiếng Việt
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
