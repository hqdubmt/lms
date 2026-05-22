'use client';

import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { MathTopic, MathExercise } from '@/types/math';
import { EXERCISE_TYPE_OPTIONS } from '@/constants/math';

interface Props {
  topics: MathTopic[];
  onCreated: (ex: MathExercise) => void;
  onClose: () => void;
}

export function GenExerciseForm({ topics, onCreated, onClose }: Props) {
  const [topicId, setTopicId] = useState('');
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [count, setCount] = useState(10);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

  const generate = async () => {
    if (!topicId) { setError('Chọn chủ đề'); return; }
    if (!title.trim()) { setError('Nhập tên bài tập'); return; }
    setLoading(true); setError('');
    try {
      const ex = await api.post<MathExercise>('/math/exercises/generate', {
        topicId, type, questionCount: count, title: title.trim(), level,
      });
      onCreated(ex);
    } catch (e: any) { setError(e.message || 'Tạo thất bại'); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-violet-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Tạo bài tập tự động</h3>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={`w-full ${selectCls}`}>
            <option value="">Chọn chủ đề *</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title} ({t._count?.concepts ?? 0} khái niệm)</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <Input placeholder="Tên bài tập *" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
          {EXERCISE_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Số câu</label>
          <input type="number" min={2} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))}
            className={`w-full ${selectCls}`} />
        </div>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung bình</option>
          <option value="advanced">Nâng cao</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={generate} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-colors">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Tạo bài tập
      </button>
    </div>
  );
}
