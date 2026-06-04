'use client';

import { useEffect, useState } from 'react';
import { Brain, RotateCcw, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRevisionQueue, completeRevision, type RevisionQueue, type RevisionItem } from '@/services/gamification';
import { api } from '@/lib/api';

const DIFFICULTY_COLORS = {
  easy:   'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  hard:   'text-red-600 bg-red-50 border-red-200',
};

const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };

const QUALITY_OPTIONS: { label: string; quality: 0 | 1 | 2 | 3 | 4 | 5; color: string }[] = [
  { label: 'Không nhớ',  quality: 0, color: 'border-red-300 text-red-600 hover:bg-red-50' },
  { label: 'Nhớ mờ',     quality: 2, color: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
  { label: 'Nhớ được',   quality: 3, color: 'border-amber-300 text-amber-600 hover:bg-amber-50' },
  { label: 'Nhớ tốt',    quality: 4, color: 'border-blue-300 text-blue-600 hover:bg-blue-50' },
  { label: 'Nhớ hoàn hảo', quality: 5, color: 'border-emerald-300 text-emerald-600 hover:bg-emerald-50' },
];

function formatDueDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return 'Hôm nay';
  const diff = Math.round((new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000);
  if (diff === 1) return 'Ngày mai';
  if (diff < 0) return `Quá hạn ${Math.abs(diff)} ngày`;
  return `${diff} ngày nữa`;
}

export default function RevisionPage() {
  const [queue, setQueue] = useState<RevisionQueue | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<RevisionItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newSubject, setNewSubject] = useState('general');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setQueue(await getRevisionQueue()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    if (!reviewing) return;
    setCompleting(true);
    try {
      await completeRevision(reviewing.id, quality);
      setReviewing(null);
      await load();
    } finally {
      setCompleting(false);
    }
  };

  const handleAdd = async () => {
    if (!newTopic.trim()) return;
    setAdding(true);
    try {
      await api.post('/ai/revision/add', { topic: newTopic.trim(), subject: newSubject });
      setNewTopic('');
      setShowAdd(false);
      await load();
    } finally {
      setAdding(false);
    }
  };

  const dueItems = queue?.due ?? [];
  const upcomingItems = queue?.upcoming ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Ôn tập thông minh
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Spaced Repetition — ôn đúng lúc, nhớ lâu hơn</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />Thêm
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Add topic form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-bold">Thêm chủ đề ôn tập</h2>
          <input
            type="text" placeholder="Tên chủ đề..." value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="general">Tổng hợp</option>
            <option value="math">Toán học</option>
            <option value="language">Ngoại ngữ</option>
            <option value="viet">Tiếng Việt</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={adding || !newTopic.trim()}
              className="flex-1 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {adding ? 'Đang thêm...' : 'Thêm vào danh sách'}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {queue && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-red-600">{queue.stats.due}</p>
            <p className="text-xs text-muted-foreground">Cần ôn hôm nay</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{queue.stats.total}</p>
            <p className="text-xs text-muted-foreground">Tổng chủ đề</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-emerald-600">{queue.stats.mastered}</p>
            <p className="text-xs text-muted-foreground">Đã thành thạo</p>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="bg-white rounded-2xl border-2 border-primary/20 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', DIFFICULTY_COLORS[reviewing.difficulty])}>
                {DIFFICULTY_LABELS[reviewing.difficulty]}
              </span>
              <p className="text-lg font-bold mt-2">{reviewing.topic}</p>
              <p className="text-xs text-muted-foreground">{reviewing.subject} · Lần ôn {reviewing.repetitions + 1}</p>
            </div>
            <button onClick={() => setReviewing(null)} className="text-muted-foreground hover:text-gray-700">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800 border border-blue-100">
            Bạn nhớ chủ đề <strong>{reviewing.topic}</strong> tốt đến mức nào?
          </div>
          <div className="grid grid-cols-1 gap-2">
            {QUALITY_OPTIONS.map(opt => (
              <button key={opt.quality} onClick={() => handleComplete(opt.quality)}
                disabled={completing}
                className={cn('py-2.5 text-sm font-medium border rounded-xl transition-all disabled:opacity-50', opt.color)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải...
        </div>
      ) : (
        <>
          {/* Due items */}
          {dueItems.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-red-600 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />Cần ôn hôm nay ({dueItems.length})
              </h2>
              {dueItems.map(item => (
                <div key={item.id}
                  className="bg-white rounded-xl border border-red-100 p-3 flex items-center gap-3 cursor-pointer hover:border-red-300 transition-colors"
                  onClick={() => setReviewing(item)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">{item.subject} · {item.repetitions} lần đã ôn</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border shrink-0', DIFFICULTY_COLORS[item.difficulty])}>
                    {DIFFICULTY_LABELS[item.difficulty]}
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-red-400 shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcomingItems.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />Sắp đến hạn
              </h2>
              {upcomingItems.map(item => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.topic}</p>
                    <p className="text-xs text-muted-foreground">{item.subject}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDueDate(item.dueDate)}</span>
                </div>
              ))}
            </div>
          )}

          {(!dueItems.length && !upcomingItems.length) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-600">Chưa có chủ đề nào</p>
              <p className="text-xs text-muted-foreground mt-1">
                Thêm chủ đề cần ôn và AI sẽ nhắc bạn đúng lúc theo spaced repetition.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
