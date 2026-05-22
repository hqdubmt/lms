'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL } from '@/constants/viet';

interface VietImportResult {
  imported: number;
  errors: { entry: string; error: string }[];
  results: { setId: string; title: string; itemsCreated: number; exercisesGenerated: number }[];
}

const FILE_TYPES = [
  { ext: 'PDF', icon: '📄' }, { ext: 'Word', icon: '📝' },
  { ext: 'Excel', icon: '📊' }, { ext: 'PowerPoint', icon: '📑' },
];
const ACCEPT = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation';

export function VietImportPanel({ onDone }: { onDone: (count: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [generateExercises, setGenerateExercises] = useState(true);
  const [grade, setGrade] = useState('');
  const [category, setCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<VietImportResult | null>(null);

  const handleFile = (f: File) => { setFile(f); setError(''); setResult(null); };

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const params = new URLSearchParams();
      if (grade) params.set('grade', grade);
      if (category) params.set('category', category);
      params.set('generateExercises', String(generateExercises));
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<VietImportResult>(`/viet/import-smart?${params}`, fd);
      setResult(res);
      if (res.imported > 0) onDone(res.imported);
    } catch (e: any) { setError(e.message || 'Nhập thất bại'); }
    setImporting(false);
  };

  if (result) return (
    <div className={cn('rounded-xl p-4 text-sm', result.imported > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
      <p className="font-semibold">{result.imported > 0 ? `✓ Nhập ${result.imported} bộ bài` : 'Thất bại'}</p>
      {result.results.map((r) => <p key={r.setId} className="text-xs mt-0.5">• {r.title}: {r.itemsCreated} mục, {r.exercisesGenerated} bài tập</p>)}
      {result.errors.map((e, i) => <p key={i} className="text-xs mt-0.5 text-red-600">✗ {e.entry}: {e.error}</p>)}
      <button onClick={() => setResult(null)} className="mt-2 text-xs text-red-600 hover:underline">Nhập thêm file khác</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3 text-xs text-red-700">
        <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>AI tự động đọc và phân tích tài liệu, tạo bộ từ vựng. Có thể mất 15–60 giây.</span>
      </div>
      <div onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={cn('border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
          file ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-red-400 hover:bg-red-50/30')}>
        <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
        <p className="text-sm text-gray-700">{file ? file.name : 'Chọn hoặc kéo thả tài liệu'}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {FILE_TYPES.map((t) => (
            <span key={t.ext} className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-600">{t.icon} {t.ext}</span>
          ))}
        </div>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phân loại (tuỳ chọn)</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
            <option value="">AI tự phát hiện</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lớp (tuỳ chọn)</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
            <option value="">AI tự phát hiện</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>Lớp {g}</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={generateExercises} onChange={(e) => setGenerateExercises(e.target.checked)} className="rounded" />
        Tự động tạo bài tập (trắc nghiệm, điền từ, chính tả, ghép đôi, sắp xếp)
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {importing && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI đang phân tích tài liệu...</span>
        </div>
      )}
      <button onClick={doImport} disabled={!file || importing}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {importing ? 'AI đang xử lý...' : 'Phân tích & Nhập giáo trình'}
      </button>
    </div>
  );
}
