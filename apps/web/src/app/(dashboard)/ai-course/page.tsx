'use client';

import { useState } from 'react';
import {
  Sparkles, BookOpen, ChevronRight, Loader2, CheckCircle2,
  GraduationCap, Clock, Globe, Users, Target, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type Language = 'vi' | 'en';

const LEVEL_CONFIG: Record<Level, { label: string; color: string }> = {
  BEGINNER:     { label: 'Cơ bản',   color: 'bg-green-50  border-green-200  text-green-700'  },
  INTERMEDIATE: { label: 'Trung cấp', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  ADVANCED:     { label: 'Nâng cao', color: 'bg-red-50    border-red-200    text-red-700'    },
};

const TEMPLATES = [
  { topic: 'Đại số cơ bản',         level: 'BEGINNER'     as Level, audience: 'học sinh lớp 8-9',          lang: 'vi' as Language },
  { topic: 'English Grammar A2',    level: 'BEGINNER'     as Level, audience: 'người mới học tiếng Anh',   lang: 'en' as Language },
  { topic: 'IELTS Writing Task 2',  level: 'ADVANCED'     as Level, audience: 'học sinh thi IELTS',         lang: 'en' as Language },
  { topic: 'Văn nghị luận xã hội',  level: 'INTERMEDIATE' as Level, audience: 'học sinh lớp 11-12',         lang: 'vi' as Language },
  { topic: 'Xác suất & Thống kê',   level: 'INTERMEDIATE' as Level, audience: 'học sinh lớp 11',            lang: 'vi' as Language },
  { topic: 'Python cơ bản',         level: 'BEGINNER'     as Level, audience: 'người mới học lập trình',   lang: 'vi' as Language },
];

interface GenResult {
  courseId: string;
  title: string;
  slug: string;
  level: string;
  chaptersCount: number;
  lessonsCount: number;
}

export default function AiCoursePage() {
  useRequireAuth();

  const [topic,    setTopic]    = useState('');
  const [level,    setLevel]    = useState<Level>('BEGINNER');
  const [audience, setAudience] = useState('học sinh phổ thông');
  const [weeks,    setWeeks]    = useState(4);
  const [language, setLanguage] = useState<Language>('vi');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<GenResult | null>(null);
  const [error,    setError]    = useState('');

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTopic(t.topic);
    setLevel(t.level);
    setAudience(t.audience);
    setLanguage(t.lang);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Vui lòng nhập chủ đề khóa học'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await api.post<GenResult>('/ai/generate-course', {
        topic: topic.trim(),
        level,
        targetAudience: audience.trim() || 'học sinh phổ thông',
        durationWeeks: weeks,
        language,
      });
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Module 4 · AI Course Generator
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tạo Khóa Học Bằng AI</h1>
          <p className="text-gray-500 text-sm">AI tự động tạo chương trình, bài học, câu hỏi và flashcard cho bạn</p>
        </div>

        {/* Templates */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chủ đề gợi ý</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(t)}
                className={cn(
                  'text-left p-3 rounded-xl border text-xs transition-all hover:shadow-sm',
                  LEVEL_CONFIG[t.level].color,
                )}
              >
                <p className="font-semibold truncate">{t.topic}</p>
                <p className="text-[10px] opacity-70 mt-0.5">{LEVEL_CONFIG[t.level].label} · {t.lang === 'en' ? 'English' : 'Tiếng Việt'}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Target className="inline h-3.5 w-3.5 mr-1 text-violet-500" />Chủ đề khóa học
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="VD: Đại số tuyến tính, IELTS Speaking, Python cơ bản..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <GraduationCap className="inline h-3.5 w-3.5 mr-1 text-violet-500" />Trình độ
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as Level)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="inline h-3.5 w-3.5 mr-1 text-violet-500" />Ngôn ngữ
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="inline h-3.5 w-3.5 mr-1 text-violet-500" />Đối tượng học
              </label>
              <input
                type="text"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="VD: học sinh lớp 10..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-3.5 w-3.5 mr-1 text-violet-500" />Thời lượng (tuần)
              </label>
              <input
                type="number"
                value={weeks}
                onChange={e => setWeeks(Math.max(1, Math.min(12, parseInt(e.target.value) || 4)))}
                min={1}
                max={12}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
              'bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI đang tạo khóa học... (30-60 giây)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Tạo Khóa Học Ngay
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-semibold">Tạo khóa học thành công!</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900">{result.title}</h2>
              <div className="flex flex-wrap gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', LEVEL_CONFIG[result.level as Level]?.color)}>
                  {LEVEL_CONFIG[result.level as Level]?.label}
                </span>
                <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 font-medium">
                  {result.chaptersCount} chương
                </span>
                <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 font-medium">
                  <BookOpen className="inline h-3 w-3 mr-1" />{result.lessonsCount} bài học
                </span>
              </div>
            </div>

            <a
              href={`/instructor/courses`}
              className="flex items-center justify-between p-3 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors group"
            >
              <span className="text-sm font-medium text-violet-700">Xem và chỉnh sửa khóa học</span>
              <ChevronRight className="h-4 w-4 text-violet-500 group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              onClick={() => { setResult(null); setTopic(''); }}
              className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Tạo khóa học khác
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
