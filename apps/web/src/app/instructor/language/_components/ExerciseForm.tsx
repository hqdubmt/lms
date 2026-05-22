'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { LANGUAGES, LEVELS, EXERCISE_TYPE_LABEL } from '@/constants/language';

const EXERCISE_TYPES = Object.keys(EXERCISE_TYPE_LABEL);

export function ExerciseForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState('en');
  const [level, setLevel] = useState('A1');
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true); setError('');
    try {
      const ex = await api.post<{ id: string }>('/language/exercises', {
        title, language: lang, level, type, description: desc, questions: [],
      });
      router.push(`/instructor/language/exercise/${ex.id}`);
    } catch (err: any) { setError(err.message || 'Tạo thất bại'); }
    setCreating(false);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Tạo bài tập mới</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Tên bài tập *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Trắc nghiệm từ vựng chủ đề Du lịch" required autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Loại bài tập</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={type} onChange={e => setType(e.target.value)}>
              {EXERCISE_TYPES.map(t => <option key={t} value={t}>{EXERCISE_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Ngôn ngữ</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={lang} onChange={e => setLang(e.target.value)}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Trình độ</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Mô tả</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả bài tập..." />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo và thêm câu hỏi
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
