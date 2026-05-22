'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { MathTopic } from '@/types/math';
import { SUBJECT_OPTIONS } from '@/constants/math';

interface Props {
  onCreated: (topic: MathTopic) => void;
  onClose: () => void;
}

export function TopicForm({ onCreated, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('ARITHMETIC');
  const [grade, setGrade] = useState(1);
  const [level, setLevel] = useState('beginner');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  const create = async () => {
    if (!title.trim()) { setError('Nhập tên chủ đề'); return; }
    setCreating(true); setError('');
    try {
      const t = await api.post<MathTopic>('/math/topics', {
        title: title.trim(), subject, grade, level, description: desc || undefined,
      });
      onCreated(t);
    } catch (e: any) { setError(e.message || 'Tạo thất bại'); }
    setCreating(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Tạo chủ đề mới</h3>
        <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input placeholder="Tên chủ đề *" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectCls}>
          {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={selectCls}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>Lớp {g}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung bình</option>
          <option value="advanced">Nâng cao</option>
        </select>
        <Input placeholder="Mô tả (tùy chọn)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={create} disabled={creating}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Tạo chủ đề
      </button>
    </div>
  );
}
