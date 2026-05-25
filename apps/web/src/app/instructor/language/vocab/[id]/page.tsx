'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Trash2, Upload, Download, Loader2, Save, X, Pencil, FileSpreadsheet, CheckCircle2, Sparkles, Video, Link as LinkIcon, MessageSquare, Volume2, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { VocabItem } from '@/types/language';

interface VocabSet {
  id: string; title: string; language: string; level: string;
  videoUrl?: string; description?: string;
  items: VocabItem[];
  creator: { id?: string; name: string };
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ item, onSave, onClose }: {
  item: VocabItem;
  onSave: (id: string, data: Partial<VocabItem>) => Promise<void>;
  onClose: () => void;
}) {
  const [word, setWord] = useState(item.word);
  const [trans, setTrans] = useState(item.translation);
  const [pron, setPron] = useState(item.pronunciation || '');
  const [example, setExample] = useState(item.example || '');
  const [exTrans, setExTrans] = useState(item.exampleTrans || '');
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !trans.trim()) return;
    setSaving(true);
    await onSave(item.id, {
      word: word.trim(),
      translation: trans.trim(),
      pronunciation: pron.trim() || undefined,
      example: example.trim() || undefined,
      exampleTrans: exTrans.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Chỉnh sửa từ vựng</h3>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Từ vựng *</label>
              <Input value={word} onChange={e => setWord(e.target.value)} placeholder="VD: beautiful" required autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nghĩa *</label>
              <Input value={trans} onChange={e => setTrans(e.target.value)} placeholder="VD: đẹp" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Phiên âm</label>
            <Input value={pron} onChange={e => setPron(e.target.value)} placeholder="VD: /ˈbjuːtɪfəl/" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ví dụ</label>
              <Input value={example} onChange={e => setExample(e.target.value)} placeholder="VD: She is beautiful." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dịch ví dụ</label>
              <Input value={exTrans} onChange={e => setExTrans(e.target.value)} placeholder="VD: Cô ấy rất đẹp." />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ghi chú</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú thêm..." />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Lưu thay đổi
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InstructorEditVocabPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { ready } = useRequireAuth('INSTRUCTOR');
  const [set, setSet] = useState<VocabSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [editItem, setEditItem] = useState<VocabItem | null>(null);

  const [word, setWord] = useState('');
  const [trans, setTrans] = useState('');
  const [pron, setPron] = useState('');
  const [example, setExample] = useState('');
  const [exTrans, setExTrans] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [videoUrl, setVideoUrl] = useState('');
  const [editingVideo, setEditingVideo] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [showFileImport, setShowFileImport] = useState(false);
  const [fileImporting, setFileImporting] = useState(false);
  const [fileImportResult, setFileImportResult] = useState<{
    created: number;
    exercises: { id: string; type: string; title: string; questionCount: number }[];
    exerciseErrors: { type: string; error: string }[];
  } | null>(null);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImporting, setSmartImporting] = useState(false);
  const [smartDragOver, setSmartDragOver] = useState(false);
  const [smartResult, setSmartResult] = useState<{
    vocabCreated: number;
    exercisesGenerated: number;
    exercises: { id: string; type: string; title: string; questionCount: number }[];
    dialogueScript: { context: string; answer: string; options: string[]; translation?: string; explanation?: string }[];
    voiceChatScript: { ai: string; hint?: string; keywords: string[]; response?: string }[];
  } | null>(null);
  const [smartError, setSmartError] = useState<string | null>(null);
  const smartFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<VocabSet>(`/language/vocab-sets/${id}`);
      setSet(data);
      setVideoUrl(data.videoUrl || '');
    } catch { router.push('/instructor/language'); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try {
      const url = videoUrl.trim() || null;
      await api.patch(`/language/vocab-sets/${id}`, { videoUrl: url });
      setSet((s) => s ? { ...s, videoUrl: url ?? undefined } : s);
      setEditingVideo(false);
    } catch {}
    setSavingVideo(false);
  };

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !trans.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await api.post(`/language/vocab-sets/${id}/items`, {
        word: word.trim(), translation: trans.trim(),
        pronunciation: pron.trim() || undefined,
        example: example.trim() || undefined,
        exampleTrans: exTrans.trim() || undefined,
        order: set?.items.length || 0,
      });
      setWord(''); setTrans(''); setPron(''); setExample(''); setExTrans('');
      await load();
    } catch (e: any) {
      setAddError(e.message || 'Thêm từ thất bại');
    }
    setAdding(false);
  };

  const saveEdit = async (itemId: string, data: Partial<VocabItem>) => {
    await api.patch(`/language/vocab-items/${itemId}`, data);
    setSet(s => s ? {
      ...s,
      items: s.items.map(i => i.id === itemId ? { ...i, ...data } : i),
    } : s);
  };

  const deleteWord = async (itemId: string) => {
    if (!confirm('Xóa từ này?')) return;
    setBusy(b => ({ ...b, [itemId]: true }));
    try {
      await api.delete(`/language/vocab-items/${itemId}`);
      setSet(s => s ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s);
    } catch { }
    setBusy(b => ({ ...b, [itemId]: false }));
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkImporting(true);
    setBulkError(null);
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const items = lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) return { word: parts[0].trim(), translation: parts[1].trim(), example: parts[2]?.trim() || undefined };
      const [w, ...rest] = line.split(/[-–—:,]/);
      return { word: w.trim(), translation: rest.join(' ').trim() };
    }).filter(i => i.word && i.translation);
    if (items.length === 0) {
      setBulkError('Không tìm thấy từ hợp lệ. Dùng định dạng: từ [tab] nghĩa hoặc từ - nghĩa');
      setBulkImporting(false);
      return;
    }
    try {
      await api.post(`/language/vocab-sets/${id}/items/bulk`, { items });
      setBulkText(''); setShowBulk(false);
      await load();
    } catch (e: any) {
      setBulkError(e.message || 'Nhập thất bại');
    }
    setBulkImporting(false);
  };

  const handleFileImport = async (file: File) => {
    const allowed = ['csv', 'xlsx', 'xls', 'ods', 'txt', 'tsv'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      setFileImportError('Chỉ hỗ trợ CSV, Excel (.xlsx/.xls/.ods), TXT, TSV');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileImportError('File tối đa 5MB');
      return;
    }
    setFileImporting(true);
    setFileImportError(null);
    setFileImportResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await api.upload<{
        created: number;
        exercises: { id: string; type: string; title: string; questionCount: number }[];
        exerciseErrors: { type: string; error: string }[];
      }>(`/language/vocab-sets/${id}/import-file`, form);
      setFileImportResult({
        created: data.created,
        exercises: data.exercises || [],
        exerciseErrors: data.exerciseErrors || [],
      });
      await load();
    } catch (e: any) {
      setFileImportError(e.message || 'Import thất bại');
    }
    setFileImporting(false);
  };

  const handleSmartImport = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { setSmartError('File tối đa 20MB'); return; }
    setSmartImporting(true); setSmartError(null); setSmartResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await api.upload<{
        vocabCreated: number;
        exercisesGenerated: number;
        exercises: { id: string; type: string; title: string; questionCount: number }[];
        dialogueScript: { context: string; answer: string; options: string[]; translation?: string; explanation?: string }[];
        voiceChatScript: { ai: string; hint?: string; keywords: string[]; response?: string }[];
      }>(`/language/vocab-sets/${id}/import-smart`, form);
      setSmartResult(data);
      await load();
    } catch (e: any) { setSmartError(e.message || 'SmartImport thất bại'); }
    setSmartImporting(false);
  };

  const downloadSmartTemplate = () => {
    const content = `=== MẪU NHẬP GIÁO TRÌNH NGOẠI NGỮ ===
(Tải file này lên SmartImport AI — AI tự trích xuất từ vựng, hội thoại và tình huống luyện nói)

**TỪ VỰNG - Chủ đề: Gia đình (Family)**
father - bố, dad - /ˈfɑːðər/ - My father is a teacher. - Bố tôi là giáo viên.
mother - mẹ, mom - /ˈmʌðər/ - My mother is kind. - Mẹ tôi tốt bụng.
brother - anh/em trai - /ˈbrʌðər/ - I have one brother. - Tôi có một anh trai.
sister - chị/em gái - /ˈsɪstər/ - My sister is 5 years old. - Em gái tôi 5 tuổi.
grandmother - bà - /ˈɡrænmʌðər/ - My grandmother cooks well. - Bà tôi nấu ăn ngon.
grandfather - ông - /ˈɡrænfɑːðər/ - Grandfather tells stories. - Ông hay kể chuyện.
family - gia đình - /ˈfæməli/ - I love my family. - Tôi yêu gia đình tôi.
parents - bố mẹ - /ˈpeərənts/ - My parents are kind. - Bố mẹ tôi tốt bụng.
children - các con - /ˈtʃɪldrən/ - The children are happy. - Các em vui vẻ.
baby - em bé - /ˈbeɪbi/ - The baby is cute. - Em bé thật dễ thương.
uncle - chú/bác - /ˈʌŋkəl/ - My uncle is tall. - Chú tôi cao.
aunt - cô/dì - /ɑːnt/ - Aunt Mary is funny. - Cô Mary vui vẻ.
cousin - anh chị em họ - /ˈkʌzən/ - I play with my cousins. - Tôi chơi với anh chị em họ.
love - yêu thương - /lʌv/ - We love each other. - Chúng tôi yêu thương nhau.
happy - vui vẻ, hạnh phúc - /ˈhæpi/ - Our family is happy. - Gia đình chúng tôi hạnh phúc.


**HỘI THOẠI - Giới thiệu gia đình**
A: Hello! Do you have any brothers or sisters?
B: Yes, I have one brother and two sisters. And you?
A: I have one sister. She is very kind.
B: How about your parents?
A: My father is a teacher and my mother is a doctor.
B: Wow! Your family sounds wonderful!
A: Thank you! What about your family?
B: I live with my grandparents. They are very wise and loving.
A: That is great! I also love spending time with my grandfather.


**BÀI ĐỌC - My Family**
My name is Lily. I am 7 years old.
I have a wonderful family. My father is tall and kind. He works as an engineer.
My mother is gentle and beautiful. She is a nurse at the local hospital.
I have one older brother named Tom. He is 10 years old. We love to play together.
My grandmother lives with us. She tells us bedtime stories every night.
Every Sunday, we visit my grandparents on my father's side.
My grandfather teaches me to play chess. My grandmother bakes delicious cookies.
We always eat dinner together as a family. I love my family very much!


**TÌNH HUỐNG LUYỆN NÓI**
1. Giới thiệu gia đình:
   Câu hỏi: "Tell me about your family."
   Trả lời: Mô tả các thành viên gia đình và nghề nghiệp của họ.
   Ví dụ: "I have a mother, a father, and one sister. My father is a doctor..."

2. Hỏi về gia đình người khác:
   Câu hỏi: "How many people are in your family?"
   Trả lời: Dùng số đếm và từ vựng về gia đình.
   Ví dụ: "There are four people in my family."

3. Nói về ông bà:
   Câu hỏi: "Do you have grandparents? What are they like?"
   Trả lời: Mô tả ông bà dùng tính từ.
   Ví dụ: "My grandmother is kind and gentle. She loves to cook..."
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau-nhap-ngoai-ngu.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    if (!set) return;
    const rows = [['word', 'translation', 'pronunciation', 'example', 'exampleTrans', 'notes']];
    set.items.forEach(i => rows.push([i.word, i.translation, i.pronunciation || '', i.example || '', i.exampleTrans || '', i.notes || '']));
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${set.title}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready || loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!set) return null;

  return (
    <div className="space-y-6 max-w-4xl p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/instructor/language')}>
          <ChevronLeft className="h-4 w-4 mr-1" />Quay lại
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{set.title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{set.language.toUpperCase()} · {set.level} · {set.items.length} từ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-1" />Xuất CSV
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => { setShowSmartImport(!showSmartImport); setShowFileImport(false); setShowBulk(false); setSmartResult(null); setSmartError(null); }}
            className="border-violet-300 text-violet-700 hover:bg-violet-50">
            <Brain className="h-4 w-4 mr-1 text-violet-500" />SmartImport AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowFileImport(!showFileImport); setShowBulk(false); setShowSmartImport(false); setFileImportResult(null); setFileImportError(null); }}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Import file
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowBulk(!showBulk); setShowFileImport(false); }}>
            <Upload className="h-4 w-4 mr-1" />Nhập hàng loạt
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditingVideo(!editingVideo)}>
            <Video className="h-4 w-4 mr-1" />{set.videoUrl ? 'Sửa video' : 'Thêm video'}
          </Button>
        </div>
      </div>

      {/* Video link panel */}
      {editingVideo && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Video className="h-4 w-4" />Link video cho bộ từ vựng này
            </p>
            <button onClick={() => setEditingVideo(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">Hỗ trợ YouTube, Vimeo hoặc link video trực tiếp. Học viên sẽ thấy video này khi học bộ từ vựng.</p>
          {set.videoUrl && !editingVideo && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{set.videoUrl}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... hoặc link video"
              className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVideo(); }}
            />
            <Button size="sm" onClick={handleSaveVideo} disabled={savingVideo}>
              {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Lưu
            </Button>
            {set.videoUrl && (
              <Button size="sm" variant="outline" onClick={() => { setVideoUrl(''); handleSaveVideo(); }}
                className="text-red-500 hover:text-red-700 border-red-200">
                Xóa
              </Button>
            )}
          </div>
          {set.videoUrl && (
            <div className="text-xs text-indigo-600 flex items-center gap-1.5">
              <LinkIcon className="h-3 w-3" />
              Video hiện tại: <span className="truncate max-w-xs">{set.videoUrl}</span>
            </div>
          )}
        </div>
      )}

      {showSmartImport && (
        <Card className="border-violet-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                SmartImport AI
                <span className="text-xs font-normal text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">AI powered</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadSmartTemplate} className="text-xs h-7 border-violet-200 text-violet-700 hover:bg-violet-50">
                  <Download className="h-3 w-3 mr-1" />Tải file mẫu
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowSmartImport(false); setSmartResult(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />AI tự động trích xuất từ tài liệu của bạn:</p>
              <ul className="space-y-0.5 list-disc list-inside text-violet-600 pl-1">
                <li>Từ vựng, phiên âm, nghĩa và câu ví dụ</li>
                <li>Bài tập hội thoại điền từ (từ đoạn hội thoại trong tài liệu)</li>
                <li>Tình huống luyện nói với AI (voice chat)</li>
                <li>4 loại bài tập tự động: trắc nghiệm, điền từ, ghép cặp, sắp xếp</li>
              </ul>
              <p className="text-violet-500">Định dạng: PDF, Word (.docx), TXT, Excel, PPT · Tối đa 20MB · Nhấn <strong>Tải file mẫu</strong> để xem cách soạn nội dung</p>
            </div>

            <input ref={smartFileRef} type="file"
              accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.pptx,.ppt,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleSmartImport(f); e.target.value = ''; }} />

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${smartDragOver ? 'border-violet-500 bg-violet-50' : 'border-border hover:border-violet-400/60 hover:bg-violet-50/30'}`}
              onClick={() => smartFileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setSmartDragOver(true); }}
              onDragLeave={() => setSmartDragOver(false)}
              onDrop={e => { e.preventDefault(); setSmartDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleSmartImport(f); }}
            >
              {smartImporting ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
                    <Sparkles className="h-4 w-4 text-violet-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-violet-700">AI đang phân tích tài liệu...</p>
                  <p className="text-xs text-muted-foreground">Thường mất 30–60 giây tuỳ độ dài file</p>
                </div>
              ) : smartResult ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="text-sm font-medium text-green-700">Import thành công!</p>
                  <p className="text-xs text-muted-foreground">Nhấn để import thêm file khác</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center">
                    <Brain className="h-7 w-7 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Kéo thả hoặc nhấn để chọn tài liệu giảng dạy</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Giáo trình, bài đọc, hội thoại mẫu, slide bài giảng...</p>
                  </div>
                </div>
              )}
            </div>

            {smartError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{smartError}</p>
            )}

            {smartResult && (
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-2xl font-bold text-green-600">{smartResult.vocabCreated}</p>
                    <p className="text-xs text-green-700 mt-0.5">Từ vựng mới</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-3 text-center border border-violet-100">
                    <p className="text-2xl font-bold text-violet-600">{smartResult.exercisesGenerated}</p>
                    <p className="text-xs text-violet-700 mt-0.5">Bài tập tạo tự động</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-2xl font-bold text-blue-600">{(smartResult.dialogueScript?.length || 0) + (smartResult.voiceChatScript?.length || 0)}</p>
                    <p className="text-xs text-blue-700 mt-0.5">Hội thoại + Nói</p>
                  </div>
                </div>

                {/* Generated exercises */}
                {smartResult.exercises.length > 0 && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-2">
                    <p className="text-sm font-semibold text-violet-800 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />Bài tập đã tạo
                    </p>
                    {smartResult.exercises.map(ex => (
                      <Link key={ex.id} href={`/instructor/language/exercise/${ex.id}`}
                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-100 hover:border-violet-400 transition-colors group">
                        <div>
                          <p className="text-sm font-medium group-hover:text-violet-700 transition-colors">{ex.title}</p>
                          <p className="text-xs text-muted-foreground">{ex.questionCount} câu hỏi</p>
                        </div>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:text-violet-600" />
                      </Link>
                    ))}
                  </div>
                )}

                {/* Dialogue exercises preview */}
                {smartResult.dialogueScript && smartResult.dialogueScript.length > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <p className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      Hội thoại điền từ ({smartResult.dialogueScript.length} bài)
                    </p>
                    {smartResult.dialogueScript.map((d, i) => (
                      <div key={i} className="bg-white rounded-xl border border-blue-100 p-3 space-y-2">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{d.context}</pre>
                        {d.translation && (
                          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans italic border-t border-gray-100 pt-1.5 mt-1">{d.translation}</pre>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-xs text-gray-500">Đáp án:</span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">{d.answer}</span>
                          {d.options.filter(o => o !== d.answer).map((opt, j) => (
                            <span key={j} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{opt}</span>
                          ))}
                        </div>
                        {d.explanation && <p className="text-xs text-gray-400 italic">{d.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice chat preview */}
                {smartResult.voiceChatScript && smartResult.voiceChatScript.length > 0 && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
                    <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4" />
                      Tình huống luyện nói ({smartResult.voiceChatScript.length} tình huống)
                    </p>
                    {smartResult.voiceChatScript.map((t, i) => (
                      <div key={i} className="bg-white rounded-xl border border-orange-100 p-3 space-y-1.5">
                        <p className="text-sm font-medium text-gray-800">🤖 {t.ai}</p>
                        {t.hint && <p className="text-xs text-gray-500 italic">💡 {t.hint}</p>}
                        {t.keywords.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-400">Từ khoá gợi ý:</span>
                            {t.keywords.map((k, j) => (
                              <span key={j} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{k}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showFileImport && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Import từ vựng từ file
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowFileImport(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Định dạng hỗ trợ</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>✓ Excel (.xlsx, .xls, .ods)</span>
                <span>✓ CSV (.csv)</span>
                <span>✓ Tab-separated (.tsv, .txt)</span>
                <span>✓ Tối đa 500 từ / 5MB</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cột 1: <strong>từ vựng</strong> · Cột 2: <strong>nghĩa</strong> · Cột 3: phiên âm · Cột 4: ví dụ · Cột 5: dịch ví dụ · Cột 6: ghi chú
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.ods,.txt,.tsv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileImport(f); e.target.value = ''; }}
            />

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileImport(f);
              }}
            >
              {fileImporting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Đang xử lý file và tạo bài tập...</p>
                </div>
              ) : fileImportResult ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <p className="text-sm font-medium text-green-700">Đã thêm {fileImportResult.created} từ vựng!</p>
                  <p className="text-xs text-muted-foreground">Nhấn để import thêm file khác</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Kéo thả file vào đây hoặc nhấn để chọn</p>
                  <p className="text-xs text-muted-foreground">CSV, Excel, TXT · Tối đa 5MB</p>
                </div>
              )}
            </div>

            {fileImportError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{fileImportError}</p>
            )}

            {fileImportResult && fileImportResult.exercises.length > 0 && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-violet-700 font-medium text-sm">
                  <Sparkles className="h-4 w-4" />
                  Đã tạo tự động {fileImportResult.exercises.length} bài tập
                </div>
                <div className="grid gap-2">
                  {fileImportResult.exercises.map(ex => (
                    <Link key={ex.id} href={`/instructor/language/exercise/${ex.id}`}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-100 hover:border-violet-400 transition-colors group">
                      <div>
                        <p className="text-sm font-medium group-hover:text-violet-700 transition-colors">{ex.title}</p>
                        <p className="text-xs text-muted-foreground">{ex.questionCount} câu hỏi</p>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:text-violet-600" />
                    </Link>
                  ))}
                </div>
                {fileImportResult.exerciseErrors.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Không tạo được: {fileImportResult.exerciseErrors.map(e => e.type).join(', ')} (thiếu dữ liệu ví dụ)
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={() => fileInputRef.current?.click()} disabled={fileImporting}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Chọn file
              </Button>
              <Button variant="outline" onClick={downloadCsv} className="text-xs">
                <Download className="h-3.5 w-3.5 mr-1" />Tải template CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showBulk && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Nhập từ hàng loạt</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBulk(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mỗi dòng 1 từ. Định dạng: <code className="bg-muted px-1 rounded">từ [tab] nghĩa [tab] ví dụ</code> hoặc <code className="bg-muted px-1 rounded">từ - nghĩa</code>
            </p>
            <textarea
              className="w-full h-40 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={"apple\ttáo\tI eat an apple every day\nbook\tcuốn sách\ncat - con mèo"}
              value={bulkText} onChange={e => setBulkText(e.target.value)}
            />
            {bulkError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{bulkError}</p>}
            <div className="flex gap-3 items-center">
              <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkText.trim()}>
                {bulkImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Nhập {bulkText.trim().split('\n').filter(Boolean).length} từ
              </Button>
              <Button variant="outline" onClick={() => { setShowBulk(false); setBulkText(''); setBulkError(null); }}>Hủy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Thêm từ mới</CardTitle></CardHeader>
        <CardContent>
          {addError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{addError}</p>}
          <form onSubmit={addWord} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Từ vựng *</label>
              <Input value={word} onChange={e => setWord(e.target.value)} placeholder="VD: beautiful" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nghĩa *</label>
              <Input value={trans} onChange={e => setTrans(e.target.value)} placeholder="VD: đẹp" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phiên âm</label>
              <Input value={pron} onChange={e => setPron(e.target.value)} placeholder="VD: /ˈbjuːtɪfəl/" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ví dụ</label>
              <Input value={example} onChange={e => setExample(e.target.value)} placeholder="VD: She is beautiful." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dịch ví dụ</label>
              <Input value={exTrans} onChange={e => setExTrans(e.target.value)} placeholder="VD: Cô ấy rất đẹp." />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={adding} className="w-full">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Thêm từ
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Danh sách từ ({set.items.length})</h2>
        {set.items.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Chưa có từ nào. Thêm từ ở trên.</CardContent></Card>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium">Từ vựng</th>
                  <th className="text-left px-4 py-3 font-medium">Nghĩa</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Phiên âm</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Ví dụ</th>
                  <th className="px-4 py-3 text-right font-medium w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {set.items.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.word}</td>
                    <td className="px-4 py-3">{item.translation}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{item.pronunciation || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs max-w-xs truncate">{item.example || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => setEditItem(item)} title="Chỉnh sửa">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={busy[item.id]} onClick={() => deleteWord(item.id)} title="Xóa">
                          {busy[item.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editItem && (
        <EditModal item={editItem} onSave={saveEdit} onClose={() => setEditItem(null)} />
      )}
    </div>
  );
}
