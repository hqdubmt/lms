'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit3, Save, X, Loader2, CheckCircle2,
  Volume2, ChevronDown, ChevronUp, GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import type { VietItem, VietSet } from '@/types/viet';
import { CATEGORY_LABEL } from '@/constants/viet';

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN'; u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function ItemCard({ item, onUpdate, onDelete }: {
  item: VietItem;
  onUpdate: (id: string, data: Partial<VietItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [word, setWord] = useState(item.word);
  const [meaning, setMeaning] = useState(item.meaning);
  const [example, setExample] = useState(item.example || '');
  const [note, setNote] = useState(item.note || '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/viet/items/${item.id}`, {
        word, meaning,
        example: example || null,
        note: note || null,
      });
      onUpdate(item.id, { word, meaning, example: example || undefined, note: note || undefined });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  if (editing) return (
    <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
      <Input placeholder="Từ / Thành ngữ *" value={word} onChange={(e) => setWord(e.target.value)} />
      <textarea placeholder="Nghĩa / Giải thích *" value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
      <textarea placeholder="Ví dụ (tùy chọn)" value={example} onChange={(e) => setExample(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
      <Input placeholder="Ghi chú / Phiên âm (tùy chọn)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu
        </button>
        <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Hủy</button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <GripVertical className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">{item.word}</p>
                <button onClick={() => speak(item.word)}
                  className="h-6 w-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0">
                  <Volume2 className="h-3 w-3" />
                </button>
              </div>
              {item.note && <p className="text-xs text-muted-foreground italic mt-0.5">{item.note}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(true)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(item.id)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{item.meaning}</p>
          {item.example && (
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-red-600 mt-1.5 hover:text-red-700">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Thu gọn' : 'Xem ví dụ'}
            </button>
          )}
          {expanded && item.example && (
            <div className="mt-2 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700">
              <p className="font-semibold text-muted-foreground mb-0.5">Ví dụ</p>
              <p className="italic">{item.example}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstructorVietSetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [set, setSet] = useState<VietSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Single item form
  const [iWord, setIWord] = useState('');
  const [iMeaning, setIMeaning] = useState('');
  const [iExample, setIExample] = useState('');
  const [iNote, setINote] = useState('');
  const [iSaving, setISaving] = useState(false);
  const [iError, setIError] = useState('');

  // Bulk form
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  useEffect(() => {
    if (!ready) return;
    api.get<VietSet>(`/viet/sets/${id}`)
      .then(setSet)
      .catch(() => router.replace('/instructor/viet'))
      .finally(() => setLoading(false));
  }, [id, ready, router]);

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!set) return null;

  const addItem = async () => {
    if (!iWord.trim() || !iMeaning.trim()) { setIError('Nhập từ và nghĩa'); return; }
    setISaving(true); setIError('');
    try {
      const item = await api.post<VietItem>(`/viet/sets/${id}/items`, {
        word: iWord.trim(), meaning: iMeaning.trim(),
        example: iExample || undefined, note: iNote || undefined,
        order: set.items.length,
      });
      setSet((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
      setIWord(''); setIMeaning(''); setIExample(''); setINote('');
      setShowForm(false);
      setToast('Đã thêm mục!');
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setIError(e.message || 'Thêm thất bại'); }
    setISaving(false);
  };

  const bulkAdd = async () => {
    setBulkSaving(true); setBulkError('');
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const items = lines.map((line, i) => {
      const parts = line.split('\t');
      if (parts.length >= 2) return { word: parts[0].trim(), meaning: parts[1].trim(), example: parts[2]?.trim() || undefined, order: i };
      const [w, ...rest] = line.split(/[-–—:]/);
      return { word: w.trim(), meaning: rest.join(' ').trim(), order: i };
    }).filter(i => i.word && i.meaning);
    if (items.length === 0) {
      setBulkError('Không tìm thấy mục hợp lệ. Dùng định dạng: từ [tab] nghĩa hoặc từ - nghĩa');
      setBulkSaving(false);
      return;
    }
    try {
      const res = await api.post<{ created: number }>(`/viet/sets/${id}/items/bulk`, { items });
      const updated = await api.get<VietSet>(`/viet/sets/${id}`);
      setSet(updated);
      setBulkText(''); setShowBulk(false);
      setToast(`Đã thêm ${res.created} mục!`);
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setBulkError(e.message || 'Thêm thất bại'); }
    setBulkSaving(false);
  };

  const updateItem = (itemId: string, data: Partial<VietItem>) => {
    setSet((prev) => prev ? { ...prev, items: prev.items.map((it) => it.id === itemId ? { ...it, ...data } : it) } : prev);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Xóa mục này?')) return;
    try {
      await api.delete(`/viet/items/${itemId}`);
      setSet((prev) => prev ? { ...prev, items: prev.items.filter((it) => it.id !== itemId) } : prev);
    } catch (e: any) { alert(e.message || 'Xóa thất bại'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-4 w-4 inline mr-2" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/instructor/viet" className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Quản lý bộ bài · {CATEGORY_LABEL[set.category] || set.category}</p>
          <h1 className="font-bold text-gray-900 truncate">{set.title}</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">
            Nhập hàng loạt
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowBulk(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors">
            <Plus className="h-3.5 w-3.5" />Thêm mục
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 text-sm">
        <div className="flex-1 grid grid-cols-3 gap-4 text-center">
          <div><p className="font-bold text-gray-900">{set.items.length}</p><p className="text-xs text-muted-foreground">Mục</p></div>
          <div><p className="font-bold text-gray-900">Lớp {set.grade}</p><p className="text-xs text-muted-foreground">Lớp</p></div>
          <div><p className="font-bold text-gray-900 capitalize">{set.level.replace('_', ' ')}</p><p className="text-xs text-muted-foreground">Cấp độ</p></div>
        </div>
      </div>

      {/* Single add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-red-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Thêm mục</h3>
            <button onClick={() => setShowForm(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <Input placeholder="Từ / Thành ngữ / Câu *" value={iWord} onChange={(e) => setIWord(e.target.value)} />
          <textarea placeholder="Nghĩa / Giải thích *" value={iMeaning} onChange={(e) => setIMeaning(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          <textarea placeholder="Ví dụ đặt câu (tùy chọn)" value={iExample} onChange={(e) => setIExample(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          <Input placeholder="Phiên âm / Ghi chú (tùy chọn)" value={iNote} onChange={(e) => setINote(e.target.value)} />
          {iError && <p className="text-sm text-red-500">{iError}</p>}
          <button onClick={addItem} disabled={iSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
            {iSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Thêm
          </button>
        </div>
      )}

      {/* Bulk text form */}
      {showBulk && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Nhập nhiều mục cùng lúc</h3>
            <button onClick={() => { setShowBulk(false); setBulkText(''); setBulkError(''); }}
              className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mỗi dòng 1 mục. Định dạng: <code className="bg-gray-100 px-1 rounded">từ [tab] nghĩa [tab] ví dụ</code> hoặc <code className="bg-gray-100 px-1 rounded">từ - nghĩa</code>
          </p>
          <textarea
            placeholder={"sơn hà\tnúi và sông, chỉ đất nước\tSơn hà xã tắc\nxã tắc\tđất nước\nbách chiến bách thắng - trăm trận trăm thắng"}
            value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          {bulkError && <p className="text-sm text-red-500">{bulkError}</p>}
          <button onClick={bulkAdd} disabled={bulkSaving || !bulkText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Nhập {bulkText.trim().split('\n').filter(Boolean).length} mục
          </button>
        </div>
      )}

      {/* Items list */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Mục ({set.items.length})</h2>
        {set.items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <span className="text-4xl block mb-2">📝</span>
            <p className="text-sm text-muted-foreground">Chưa có mục nào</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-red-600 hover:underline font-medium">
              + Thêm mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {set.items.map((item) => (
              <ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
