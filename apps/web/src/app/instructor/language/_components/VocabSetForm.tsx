'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { LANGUAGES, LEVELS } from '@/constants/language';

export function VocabSetForm({ onClose, parentId, onCreated }: {
  onClose: () => void;
  parentId?: string;
  onCreated?: (set: { id: string }) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [lang, setLang] = useState('en');
  const [level, setLevel] = useState('A1');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true); setError('');
    try {
      let created: { id: string };
      if (parentId) {
        // Create as child sub-topic of parent set
        created = await api.post<{ id: string }>(`/language/vocab-sets/${parentId}/children`, { title, level, description: desc });
      } else {
        created = await api.post<{ id: string }>('/language/vocab-sets', { title, language: lang, level, description: desc });
      }
      if (onCreated) { onCreated(created); onClose(); }
      else router.push(`/instructor/language/vocab/${created.id}`);
    } catch (err: any) { setError(err.message || 'Tạo thất bại'); }
    setCreating(false);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{parentId ? 'Thêm chủ đề con' : 'Tạo bộ từ vựng mới'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">{parentId ? 'Tên chủ đề *' : 'Tên bộ từ vựng *'}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={parentId ? 'VD: Chủ đề Du lịch' : 'VD: Từ vựng IELTS Band 6.0'} required autoFocus />
          </div>
          {!parentId && (
            <div>
              <label className="text-sm font-medium mb-1 block">Ngôn ngữ</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={lang} onChange={e => setLang(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Trình độ</label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={level} onChange={e => setLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium mb-1 block">Mô tả</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả ngắn..." />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {parentId ? 'Tạo chủ đề' : 'Tạo và thêm từ'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
