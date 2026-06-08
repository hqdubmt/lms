'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Clock, ChevronDown, ChevronUp, Loader2, RefreshCw, HelpCircle, Lightbulb, PenLine, BookOpen, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Section { type: string; title: string; content: string }
interface QuizItem { question: string; answer: string }

interface TeacherSession {
  title: string;
  objectives: string[];
  sections: Section[];
  quiz: QuizItem[];
  summary: string;
  estimatedMinutes: number;
}

interface TeacherData {
  subject: string;
  topic: string;
  session: TeacherSession;
  weakTopics: string[];
}

const SUBJECTS = [
  { key: 'general',  label: 'Tổng hợp' },
  { key: 'math',     label: 'Toán học' },
  { key: 'viet',     label: 'Tiếng Việt' },
  { key: 'language', label: 'Ngoại ngữ' },
];

const SECTION_ICON: Record<string, React.ElementType> = {
  intro: Play, explain: BookOpen, example: Lightbulb, practice: PenLine,
};

const SECTION_COLOR: Record<string, string> = {
  intro: 'bg-blue-50 border-blue-100',
  explain: 'bg-purple-50 border-purple-100',
  example: 'bg-yellow-50 border-yellow-100',
  practice: 'bg-green-50 border-green-100',
};

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(section.type === 'intro' || section.type === 'explain');
  const Icon = SECTION_ICON[section.type] ?? BookOpen;
  const colorClass = SECTION_COLOR[section.type] ?? 'bg-gray-50 border-gray-100';

  return (
    <div className={cn('rounded-2xl border overflow-hidden', colorClass)}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/50 transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0 text-gray-600" />
        <span className="flex-1 font-semibold text-sm">{section.title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function AITeacherPage() {
  useRequireAuth();

  const [subject, setSubject] = useState('general');
  const [topicInput, setTopicInput] = useState('');
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [revealedIdx, setRevealedIdx] = useState<number[]>([]);

  const load = async (s = subject, t = '') => {
    setLoading(true);
    setData(null);
    setRevealedIdx([]);
    setQuizOpen(false);
    try {
      const params = new URLSearchParams({ subject: s });
      if (t.trim()) params.set('topic', t.trim());
      const res = await api.get<TeacherData>(`/ai/teacher-session?${params}`);
      setData(res);
    } catch { /* noop */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleReveal = (i: number) =>
    setRevealedIdx(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-600" /> AI Teacher
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Giáo viên AI soạn bài học cá nhân cho bạn</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSubject(s.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                subject === s.key ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(subject, topicInput)}
            placeholder="Nhập chủ đề muốn học (hoặc để AI tự chọn)..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={() => load(subject, topicInput)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            Dạy tôi
          </button>
        </div>
        {data?.weakTopics && data.weakTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Gợi ý:</span>
            {data.weakTopics.map(t => (
              <button
                key={t}
                onClick={() => { setTopicInput(t); load(subject, t); }}
                className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs hover:bg-amber-100 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-muted-foreground">AI đang soạn bài học...</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Lesson header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-white/70 font-medium uppercase tracking-wide">{data.subject} · {data.topic}</p>
                <h2 className="text-xl font-bold mt-1">{data.session.title}</h2>
                <p className="text-sm text-white/80 mt-1">{data.session.summary}</p>
              </div>
              <div className="flex items-center gap-1 text-white/80 text-sm shrink-0">
                <Clock className="h-4 w-4" /> {data.session.estimatedMinutes} ph
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.session.objectives.map((obj, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/15 rounded-lg text-xs font-medium">{obj}</span>
              ))}
            </div>
          </div>

          {/* Lesson sections */}
          <div className="space-y-3">
            {data.session.sections.map((sec, i) => (
              <SectionCard key={i} section={sec} />
            ))}
          </div>

          {/* Quiz */}
          {data.session.quiz.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setQuizOpen(v => !v)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <HelpCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span className="flex-1 font-semibold text-sm text-left">Câu hỏi kiểm tra ({data.session.quiz.length} câu)</span>
                {quizOpen ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>
              {quizOpen && (
                <div className="px-4 pb-4 space-y-3">
                  {data.session.quiz.map((q, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 p-3">
                      <p className="text-sm font-medium text-gray-800">{i + 1}. {q.question}</p>
                      <button
                        onClick={() => toggleReveal(i)}
                        className={cn(
                          'mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors',
                          revealedIdx.includes(i)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                      >
                        {revealedIdx.includes(i) ? `Đáp án: ${q.answer}` : 'Xem đáp án'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => load(subject, topicInput)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Tạo bài học mới
          </button>
        </>
      )}
    </div>
  );
}
