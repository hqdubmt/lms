'use client';

import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { VietSet } from '@/types/viet';
import { CATEGORY_OPTIONS } from '@/constants/viet';

interface Props {
  onCreated: (set: VietSet) => void;
  onClose: () => void;
}

export function SetForm({ onCreated, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TU_VUNG');
  const [grade, setGrade] = useState(1);
  const [level, setLevel] = useState('co_ban');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

  const create = async () => {
    if (!title.trim()) { setError('Nhập tên bộ bài'); return; }
    setCreating(true); setError('');
    try {
      const s = await api.post<VietSet>('/viet/sets', {
        title: title.trim(), category, grade, level, description: desc || undefined,
      });
      onCreated(s);
    } catch (e: any) { setError(e.message || 'Tạo thất bại'); }
    setCreating(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Tạo bộ bài mới</h3>
        <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Input placeholder="Tên bộ bài *" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className={selectCls}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>Lớp {g}</option>)}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls}>
          <option value="co_ban">Cơ bản</option>
          <option value="trung_binh">Trung bình</option>
          <option value="nang_cao">Nâng cao</option>
        </select>
        <Input placeholder="Mô tả (tùy chọn)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button onClick={create} disabled={creating}
        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Tạo bộ bài
      </button>
    </div>
  );
}
