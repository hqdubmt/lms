'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, X, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import type { VocabSet } from '@/types/language';
import { LEVELS } from '@/constants/language';

interface Props {
  sets: (VocabSet & { parentTitle?: string })[];
  onClose: () => void;
}

export function GenExerciseForm({ sets, onClose }: Props) {
  const router = useRouter();
  const [vocabSetId, setVocabSetId] = useState('');
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [count, setCount] = useState(10);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('A1');
  const [keyword, setKeyword] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabSetId || !title.trim()) return;
    setGenerating(true); setError('');
    try {
      const ex = await api.post<{ id: string }>('/language/exercises/generate', {
        vocabSetId, type, questionCount: count, title, level,
        keyword: keyword.trim() || undefined, isPublic: true,
      });
      router.push(`/instructor/language/exercise/${ex.id}`);
    } catch (err: any) {
      setError(err.message || 'Tạo thất bại');
      setGenerating(false);
    }
  };

  return (
    <Card className="mb-4 border-violet-200 bg-violet-50/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Tạo bài tập tự động từ từ vựng
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Hệ thống sẽ tự động tạo câu hỏi từ dữ liệu từ vựng trong bộ bạn chọn.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Tên bài tập *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="VD: Bài tập tự động - Từ vựng Du lịch" required autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Bộ từ vựng *</label>
            {sets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Bạn chưa có bộ từ vựng nào. Hãy tạo và import từ vựng trước.</p>
            ) : (
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={vocabSetId} onChange={e => setVocabSetId(e.target.value)} required>
                <option value="">-- Chọn bộ từ vựng --</option>
                {(() => {
                  // Group by parentTitle, then render optgroup per folder
                  const grouped = new Map<string, typeof sets>();
                  sets.forEach(s => {
                    const key = s.parentTitle ?? '';
                    if (!grouped.has(key)) grouped.set(key, []);
                    grouped.get(key)!.push(s);
                  });
                  return Array.from(grouped.entries()).map(([parent, children]) =>
                    parent ? (
                      <optgroup key={parent} label={`📁 ${parent}`}>
                        {children.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({s._count?.items ?? 0} từ)
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      children.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s._count?.items ?? 0} từ)
                        </option>
                      ))
                    )
                  );
                })()}
              </select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Loại câu hỏi</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={type} onChange={e => setType(e.target.value)}>
              <option value="MULTIPLE_CHOICE">Trắc nghiệm (chọn nghĩa đúng)</option>
              <option value="FILL_BLANK">Điền từ vào câu</option>
              <option value="MATCHING">Ghép cặp từ - nghĩa</option>
              <option value="WORD_ORDER">Sắp xếp câu</option>
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
            <label className="text-sm font-medium mb-1 block">Số câu hỏi</label>
            <Input type="number" min={3} max={50} value={count}
              onChange={e => setCount(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Từ khóa lọc <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8" value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="VD: travel, food, body..." />
            </div>
          </div>
          {error && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" disabled={generating || !vocabSetId}
              className="bg-violet-600 hover:bg-violet-700">
              {generating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang tạo...</>
                : <><Sparkles className="h-4 w-4 mr-2" />Tạo bài tập</>}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
