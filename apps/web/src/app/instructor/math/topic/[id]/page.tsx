'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Edit3, Save, X, Loader2, CheckCircle2,
  Calculator, Lightbulb, ChevronDown, ChevronUp, GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';
import type { MathConcept, MathTopic } from '@/types/math';

function ConceptCard({ concept, onUpdate, onDelete }: {
  concept: MathConcept;
  onUpdate: (id: string, data: Partial<MathConcept>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(concept.name);
  const [definition, setDefinition] = useState(concept.definition);
  const [formula, setFormula] = useState(concept.formula || '');
  const [example, setExample] = useState(concept.example || '');
  const [solution, setSolution] = useState(concept.solution || '');
  const [hints, setHints] = useState(concept.hints.join('\n'));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/math/concepts/${concept.id}`, {
        name, definition, formula: formula || null, example: example || null,
        solution: solution || null, hints: hints.split('\n').filter((h) => h.trim()),
      });
      onUpdate(concept.id, { name, definition, formula: formula || undefined, example: example || undefined, solution: solution || undefined, hints: hints.split('\n').filter((h) => h.trim()) });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  if (editing) return (
    <div className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3">
      <Input placeholder="Tên khái niệm *" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea placeholder="Định nghĩa *" value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      <Input placeholder="Công thức (tùy chọn, e.g. a² + b² = c²)" value={formula} onChange={(e) => setFormula(e.target.value)} />
      <textarea placeholder="Ví dụ (tùy chọn)" value={example} onChange={(e) => setExample(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      <textarea placeholder="Lời giải (tùy chọn)" value={solution} onChange={(e) => setSolution(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      <textarea placeholder="Gợi ý (mỗi gợi ý một dòng)" value={hints} onChange={(e) => setHints(e.target.value)} rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
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
              <p className="font-semibold text-gray-900 text-sm">{concept.name}</p>
              {concept.formula && (
                <span className="inline-block font-mono text-blue-700 text-xs bg-blue-50 rounded px-2 py-0.5 mt-1">{concept.formula}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(true)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(concept.id)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{concept.definition}</p>
          {(concept.example || concept.hints.length > 0) && (
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-blue-600 mt-1.5 hover:text-blue-700">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
          {expanded && (
            <div className="mt-2 space-y-2">
              {concept.example && (
                <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700">
                  <p className="font-semibold text-muted-foreground mb-0.5">Ví dụ</p>
                  <p className="whitespace-pre-wrap">{concept.example}</p>
                </div>
              )}
              {concept.hints.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-2.5 text-xs text-amber-800">
                  <p className="font-semibold text-amber-700 mb-0.5 flex items-center gap-1"><Lightbulb className="h-3 w-3" />Gợi ý</p>
                  {concept.hints.map((h, i) => <p key={i}>• {h}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstructorMathTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [topic, setTopic] = useState<MathTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Single concept form
  const [cName, setCName] = useState('');
  const [cDef, setCDef] = useState('');
  const [cFormula, setCFormula] = useState('');
  const [cExample, setCExample] = useState('');
  const [cSolution, setCSolution] = useState('');
  const [cHints, setCHints] = useState('');
  const [cSaving, setCSaving] = useState(false);
  const [cError, setCError] = useState('');

  // Bulk form
  const [bulkJson, setBulkJson] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  useEffect(() => {
    if (!ready) return;
    api.get<MathTopic>(`/math/topics/${id}`)
      .then(setTopic)
      .catch(() => router.replace('/instructor/math'))
      .finally(() => setLoading(false));
  }, [id, ready, router]);

  if (!ready || loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!topic) return null;

  const addConcept = async () => {
    if (!cName.trim() || !cDef.trim()) { setCError('Nhập tên và định nghĩa'); return; }
    setCSaving(true); setCError('');
    try {
      const concept = await api.post<MathConcept>(`/math/topics/${id}/concepts`, {
        name: cName.trim(), definition: cDef.trim(),
        formula: cFormula || undefined, example: cExample || undefined,
        solution: cSolution || undefined,
        hints: cHints.split('\n').filter((h) => h.trim()),
        order: topic.concepts.length,
      });
      setTopic((prev) => prev ? { ...prev, concepts: [...prev.concepts, concept] } : prev);
      setCName(''); setCDef(''); setCFormula(''); setCExample(''); setCSolution(''); setCHints('');
      setShowForm(false);
      setToast('Đã thêm khái niệm!');
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setCError(e.message || 'Thêm thất bại'); }
    setCSaving(false);
  };

  const bulkAdd = async () => {
    setBulkSaving(true); setBulkError('');
    try {
      const parsed = JSON.parse(bulkJson);
      const concepts = Array.isArray(parsed) ? parsed : [parsed];
      const res = await api.post<{ created: number }>(`/math/topics/${id}/concepts/bulk`, { concepts });
      const updated = await api.get<MathTopic>(`/math/topics/${id}`);
      setTopic(updated);
      setBulkJson(''); setShowBulk(false);
      setToast(`Đã thêm ${res.created} khái niệm!`);
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) { setBulkError(e.message || 'JSON không hợp lệ hoặc thêm thất bại'); }
    setBulkSaving(false);
  };

  const updateConcept = (cid: string, data: Partial<MathConcept>) => {
    setTopic((prev) => prev ? { ...prev, concepts: prev.concepts.map((c) => c.id === cid ? { ...c, ...data } : c) } : prev);
  };

  const deleteConcept = async (cid: string) => {
    if (!confirm('Xóa khái niệm này?')) return;
    try {
      await api.delete(`/math/concepts/${cid}`);
      setTopic((prev) => prev ? { ...prev, concepts: prev.concepts.filter((c) => c.id !== cid) } : prev);
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
        <Link href="/instructor/math" className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Quản lý chủ đề</p>
          <h1 className="font-bold text-gray-900 truncate">{topic.title}</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors">
            <Calculator className="h-3.5 w-3.5" />Nhập JSON
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowBulk(false); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors">
            <Plus className="h-3.5 w-3.5" />Thêm khái niệm
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 text-sm">
        <div className="flex-1 grid grid-cols-3 gap-4 text-center">
          <div><p className="font-bold text-gray-900">{topic.concepts.length}</p><p className="text-xs text-muted-foreground">Khái niệm</p></div>
          <div><p className="font-bold text-gray-900">Lớp {topic.grade}</p><p className="text-xs text-muted-foreground">Lớp</p></div>
          <div><p className="font-bold text-gray-900">{topic.level}</p><p className="text-xs text-muted-foreground">Cấp độ</p></div>
        </div>
      </div>

      {/* Single add form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Thêm khái niệm</h3>
            <button onClick={() => setShowForm(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <Input placeholder="Tên khái niệm / định lý *" value={cName} onChange={(e) => setCName(e.target.value)} />
          <textarea placeholder="Định nghĩa *" value={cDef} onChange={(e) => setCDef(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <Input placeholder="Công thức (e.g. S = πr²)" value={cFormula} onChange={(e) => setCFormula(e.target.value)} />
          <textarea placeholder="Ví dụ bài toán (tùy chọn)" value={cExample} onChange={(e) => setCExample(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <textarea placeholder="Lời giải (tùy chọn)" value={cSolution} onChange={(e) => setCSolution(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <textarea placeholder="Gợi ý (mỗi dòng 1 gợi ý)" value={cHints} onChange={(e) => setCHints(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          {cError && <p className="text-sm text-red-500">{cError}</p>}
          <button onClick={addConcept} disabled={cSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
            {cSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Thêm
          </button>
        </div>
      )}

      {/* Bulk JSON form */}
      {showBulk && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-900">Nhập nhiều khái niệm (JSON)</h3>
            <button onClick={() => setShowBulk(false)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600">
            {`[{"name":"Định lý Pythagoras","definition":"...","formula":"a²+b²=c²","example":"...","hints":["Gợi ý 1"]}]`}
          </div>
          <textarea placeholder="Dán JSON vào đây..." value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} rows={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          {bulkError && <p className="text-sm text-red-500">{bulkError}</p>}
          <button onClick={bulkAdd} disabled={bulkSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60">
            {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Nhập
          </button>
        </div>
      )}

      {/* Concepts */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Khái niệm ({topic.concepts.length})</h2>
        {topic.concepts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <Calculator className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chưa có khái niệm nào</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
              + Thêm khái niệm đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {topic.concepts.map((c) => (
              <ConceptCard key={c.id} concept={c} onUpdate={updateConcept} onDelete={deleteConcept} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
