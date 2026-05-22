'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, Play, FileText, CheckCircle2,
  ArrowLeft, Loader2, Lock, ExternalLink, Calendar, Clock, Video,
  PanelRightOpen, X, MessageCircle, Send, Trash2,
  HelpCircle, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketStore } from '@/stores/socket.store';

interface Lesson {
  id: string; title: string; type: string; order: number;
  isFree: boolean; isPublished: boolean; videoDuration?: number;
}
interface Section { id: string; title: string; order: number; lessons: Lesson[] }
interface Course {
  id: string; title: string; slug: string; sections: Section[];
  instructor: { id: string; name: string; avatarUrl?: string };
}
interface LessonDetail {
  id: string; title: string; type: string; videoUrl?: string; textContent?: string;
  description?: string; videoDuration?: number;
  progress?: { isCompleted: boolean; lastPosition?: number };
}
interface LiveSession {
  id: string; title: string; description?: string;
  startTime: string; endTime: string; meetLink: string;
  status: 'SCHEDULED' | 'LIVE';
  creator: { name: string };
}
interface ChatMessage {
  _id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  content: string;
  type: string;
  createdAt: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  order: number;
}

interface QuizResult {
  id: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  explanation: string | null;
}

// ─── Quiz Section Component ────────────────────────────────────────────────────

function QuizSection({ lessonId, onComplete }: { lessonId: string; onComplete: () => void }) {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSubmitted(false);
    setAnswers({});
    setResults([]);
    api.get<QuizQuestion[]>(`/lessons/${lessonId}/quizzes`)
      .then(setQuizzes)
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quizzes.length) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ score: number; correct: number; total: number; results: QuizResult[] }>(
        `/lessons/${lessonId}/quizzes/submit`,
        { answers },
      );
      setResults(res.results);
      setScore(res.score);
      setTotal(res.total);
      setSubmitted(true);
      if (res.score >= 80) onComplete();
    } catch {
      // ignore
    }
    setSubmitting(false);
  };

  const reset = () => {
    setSubmitted(false);
    setAnswers({});
    setResults([]);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (quizzes.length === 0) return null;

  const resultMap = Object.fromEntries(results.map((r) => [r.id, r]));
  const allAnswered = Object.keys(answers).length === quizzes.length;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-primary/15 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Kiểm tra kiến thức</h3>
          <p className="text-xs text-muted-foreground">{quizzes.length} câu hỏi · Cần đạt 80% để hoàn thành bài học</p>
        </div>
        {submitted && (
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${score >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {score}%
          </div>
        )}
      </div>

      {/* Score summary */}
      {submitted && (
        <div className={`px-5 py-3 flex items-center gap-3 ${score >= 80 ? 'bg-green-50 border-b border-green-100' : 'bg-orange-50 border-b border-orange-100'}`}>
          {score >= 80
            ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            : <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />}
          <p className="text-sm font-medium flex-1">
            {score >= 80
              ? `Xuất sắc! Bạn đúng ${results.filter((r) => r.isCorrect).length}/${total} câu. Bài học đã được đánh dấu hoàn thành.`
              : `Bạn đúng ${results.filter((r) => r.isCorrect).length}/${total} câu. Hãy xem lại và thử lại!`}
          </p>
          {score < 80 && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:underline shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />Thử lại
            </button>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="p-5 space-y-6">
        {quizzes.map((q, qi) => {
          const result = resultMap[q.id];
          const selected = answers[q.id];

          return (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-semibold leading-snug">
                <span className="text-primary mr-2">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  let cls = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ';
                  if (!submitted) {
                    cls += selected === oi
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
                  } else {
                    if (oi === result?.correct) cls += 'border-green-400 bg-green-50 text-green-800 font-medium';
                    else if (oi === result?.selected && !result.isCorrect) cls += 'border-red-300 bg-red-50 text-red-700';
                    else cls += 'border-gray-100 bg-white/60 text-muted-foreground';
                  }

                  return (
                    <button
                      key={oi}
                      className={cls}
                      disabled={submitted}
                      onClick={() => !submitted && setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    >
                      <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                        !submitted && selected === oi ? 'border-primary bg-primary text-white'
                        : submitted && oi === result?.correct ? 'border-green-500 bg-green-500 text-white'
                        : submitted && oi === result?.selected && !result?.isCorrect ? 'border-red-400 bg-red-400 text-white'
                        : 'border-gray-300'
                      }`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {submitted && result?.explanation && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">{result.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!submitted && (
        <div className="px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? 'Đang chấm...' : `Nộp bài (${Object.keys(answers).length}/${quizzes.length} câu đã trả lời)`}
          </button>
        </div>
      )}
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

function VideoPlayer({ videoUrl, accessToken, onEnded }: {
  videoUrl: string; accessToken: string | null; onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isHls = videoUrl.includes('.m3u8');
  const srcWithToken = videoUrl.startsWith('/api/') && accessToken
    ? `${videoUrl}?token=${accessToken}` : videoUrl;

  useEffect(() => {
    if (!isHls || !videoRef.current) return;
    let destroyed = false;
    let hlsInstance: any = null;
    import('hls.js').then(({ default: Hls }) => {
      if (destroyed || !videoRef.current) return;
      if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(srcWithToken);
        hlsInstance.attachMedia(videoRef.current);
      } else {
        videoRef.current.src = srcWithToken;
      }
    });
    return () => { destroyed = true; hlsInstance?.destroy(); };
  }, [srcWithToken, isHls]);

  const youtubeUrl = getYouTubeEmbedUrl(videoUrl);
  const vimeoUrl = !youtubeUrl ? getVimeoEmbedUrl(videoUrl) : null;

  if (youtubeUrl || vimeoUrl) {
    return (
      <div className="rounded-xl overflow-hidden bg-black aspect-video">
        <iframe
          src={(youtubeUrl || vimeoUrl)!}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-black aspect-video">
      <video
        ref={videoRef}
        key={videoUrl}
        className="w-full h-full"
        controls
        autoPlay={false}
        {...(!isHls ? { src: srcWithToken } : {})}
        onEnded={onEnded}
      />
    </div>
  );
}

const LESSON_ICON: Record<string, any> = {
  VIDEO: Play, TEXT: FileText, LIVE: ExternalLink,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
function fmtChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function Avatar({ name, src, size = 8 }: { name: string; src?: string; size?: number }) {
  const cls = `h-${size} w-${size} rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-primary/10`;
  if (src) return <img src={src} alt={name} className={`${cls} object-cover`} />;
  return (
    <div className={cls}>
      <span className="text-xs font-semibold text-primary">{name?.[0]?.toUpperCase()}</span>
    </div>
  );
}

export default function LearnPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const { socket } = useSocketStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [showSessions, setShowSessions] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Chat state ──
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatJoinedRef = useRef(false);

  useEffect(() => {
    Promise.all([
      api.get<Course>(`/courses/${slug}`),
      api.get<LiveSession[]>(`/courses/${slug}/sessions`).catch(() => []),
    ]).then(([courseData, sessionsData]) => {
      setCourse(courseData);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      const exp: Record<string, boolean> = {};
      courseData.sections.forEach((s) => { exp[s.id] = true; });
      setExpanded(exp);
      const lessonId = new URLSearchParams(window.location.search).get('lesson');
      const firstLesson = courseData.sections[0]?.lessons[0];
      const target = lessonId || firstLesson?.id;
      if (target) openLesson(target);
    }).catch(() => router.replace('/dashboard'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ── Chat: join room + load history + listen ──
  useEffect(() => {
    if (!course || !socket) return;
    const roomId = `course:${course.id}`;

    if (!chatJoinedRef.current) {
      socket.emit('chat:join', roomId);
      chatJoinedRef.current = true;
    }

    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpen) setUnread((n) => n + 1);
    };
    socket.on('chat:message', handler);
    return () => { socket.off('chat:message', handler); };
  }, [course?.id, socket, chatOpen]);

  useEffect(() => {
    if (!chatOpen || !course) return;
    setUnread(0);
    setChatLoading(true);
    api.get<ChatMessage[]>(`/courses/${course.id}/chat`)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setChatLoading(false));
  }, [chatOpen, course?.id]);

  useEffect(() => {
    if (chatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatOpen]);

  const openLesson = useCallback(async (lessonId: string) => {
    if (activeLessonId === lessonId) return;
    setActiveLessonId(lessonId);
    setLoadingLesson(true);
    try {
      const data = await api.get<LessonDetail>(`/lessons/${lessonId}`);
      setActiveLesson(data);
      if (data.progress?.isCompleted) setCompleted((p) => new Set([...p, lessonId]));
    } catch {
      setActiveLesson(null);
    }
    setLoadingLesson(false);
  }, [activeLessonId]);

  const markComplete = async () => {
    if (!activeLessonId) return;
    await api.patch(`/lessons/${activeLessonId}/progress`, { isCompleted: true }).catch(() => {});
    setCompleted((p) => new Set([...p, activeLessonId]));
  };

  const nextLesson = () => {
    if (!course || !activeLessonId) return;
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const idx = allLessons.findIndex((l) => l.id === activeLessonId);
    if (idx < allLessons.length - 1) openLesson(allLessons[idx + 1].id);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !course || sending) return;
    setSending(true);
    socket.emit('chat:message', { roomId: `course:${course.id}`, content: chatInput.trim() });
    setChatInput('');
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    if (!course) return;
    await api.delete(`/courses/${course.id}/chat/${msgId}`).catch(() => {});
    setMessages((prev) => prev.filter((m) => m._id !== msgId));
  };

  if (!course) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const totalLessons = course.sections.flatMap((s) => s.lessons).length;
  const completedCount = completed.size;
  const liveSessions = sessions.filter((s) => s.status === 'LIVE');
  const isInstructorOrAdmin = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Mobile overlay (sidebar) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Left sidebar ── */}
      <aside className={[
        'bg-background border-r flex flex-col overflow-hidden transition-transform duration-300',
        'lg:w-72 lg:shrink-0 lg:static lg:translate-x-0',
        'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>
        {/* Header */}
        <div className="h-14 px-3 border-b flex items-center gap-2 shrink-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{course.title}</div>
            <div className="text-xs text-muted-foreground">{completedCount}/{totalLessons} bài</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted shrink-0">
          <div className="h-full bg-primary transition-all" style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Live sessions */}
          {sessions.length > 0 && (
            <div className="border-b">
              <button onClick={() => setShowSessions(!showSessions)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 text-sm font-medium text-left">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 text-primary">Lịch học trực tuyến</span>
                {liveSessions.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
                <span className="text-xs text-muted-foreground shrink-0">{sessions.length}</span>
                {showSessions ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </button>
              {showSessions && (
                <div className="divide-y divide-muted/50">
                  {sessions.map((session) => (
                    <div key={session.id} className={`px-3 py-2.5 ${session.status === 'LIVE' ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${session.status === 'LIVE' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted'}`}>
                          <Video className={`h-3.5 w-3.5 ${session.status === 'LIVE' ? 'text-red-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium leading-tight truncate">{session.title}</span>
                            {session.status === 'LIVE' && <span className="text-xs font-semibold text-red-600 shrink-0">● LIVE</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.status === 'LIVE' ? `Đến ${fmtTime(session.endTime)}` : fmtDate(session.startTime)}
                          </div>
                          <button onClick={() => window.open(session.meetLink, '_blank')}
                            className={`mt-1.5 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md w-full justify-center transition-colors ${session.status === 'LIVE' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                            <ExternalLink className="h-3 w-3" />
                            {session.status === 'LIVE' ? 'Vào phòng học ngay' : 'Link Google Meet'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lesson list */}
          {course.sections.map((section) => (
            <div key={section.id}>
              <button onClick={() => setExpanded((p) => ({ ...p, [section.id]: !p[section.id] }))}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/70 text-sm font-medium text-left border-b">
                {expanded[section.id] ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <span className="flex-1 truncate">{section.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{section.lessons.length}</span>
              </button>
              {expanded[section.id] && section.lessons.map((lesson) => {
                const Icon = LESSON_ICON[lesson.type] || Play;
                const isActive = lesson.id === activeLessonId;
                const isDone = completed.has(lesson.id);
                return (
                  <button key={lesson.id} onClick={() => openLesson(lesson.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-b border-muted/50 ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'}`}>
                    {isDone
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />}
                    <span className="flex-1 truncate leading-snug">{lesson.title}</span>
                    {lesson.videoDuration && <span className="text-xs text-muted-foreground shrink-0">{formatDuration(lesson.videoDuration)}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 h-12 bg-background border-b flex items-center px-3 gap-2 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <PanelRightOpen className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{activeLesson?.title ?? course.title}</div>
            <div className="text-xs text-muted-foreground">{completedCount}/{totalLessons} bài đã học</div>
          </div>
          {/* Chat button mobile */}
          <button onClick={() => setChatOpen(true)} className="relative h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
        </div>

        {/* LIVE banner */}
        {liveSessions.length > 0 && (
          <div className="bg-red-600 text-white px-6 py-3 flex items-center gap-4 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">Đang có buổi học trực tuyến: </span>
              <span className="text-sm opacity-90">{liveSessions[0].title}</span>
            </div>
            <button onClick={() => window.open(liveSessions[0].meetLink, '_blank')}
              className="shrink-0 bg-white text-red-600 hover:bg-red-50 font-semibold text-sm px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
              <ExternalLink className="h-4 w-4" />Vào phòng học
            </button>
          </div>
        )}

        {loadingLesson ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !activeLesson ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground">
            Chọn bài học để bắt đầu
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 w-full">
            {/* Lesson title + chat button desktop */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold">{activeLesson.title}</h1>
                {activeLesson.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activeLesson.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={completed.has(activeLessonId!) ? 'default' : 'outline'}>
                  {completed.has(activeLessonId!) ? '✓ Hoàn thành' : activeLesson.type}
                </Badge>
                {/* Chat button desktop */}
                <button onClick={() => setChatOpen(true)}
                  className="hidden lg:flex relative items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-muted transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span>Thảo luận</span>
                  {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Video player */}
            {activeLesson.type === 'VIDEO' && (
              activeLesson.videoUrl ? (
                <VideoPlayer
                  videoUrl={activeLesson.videoUrl}
                  accessToken={accessToken}
                  onEnded={markComplete}
                />
              ) : (
                <div className="rounded-xl bg-muted aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Lock className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Video chưa được tải lên</p>
                </div>
              )
            )}

            {/* Text content */}
            {activeLesson.type === 'TEXT' && activeLesson.textContent && (
              <div className="prose prose-sm max-w-none bg-muted/30 rounded-xl p-6"
                dangerouslySetInnerHTML={{ __html: activeLesson.textContent }} />
            )}

            {/* Live lesson */}
            {activeLesson.type === 'LIVE' && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <p className="text-center text-muted-foreground text-sm">Bài học này là buổi học trực tiếp qua Google Meet.</p>
                {sessions.length > 0 ? (
                  <div className="w-full max-w-md space-y-2">
                    {sessions.map((s) => (
                      <div key={s.id} className={`rounded-lg border p-4 flex items-center gap-4 ${s.status === 'LIVE' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'border-muted bg-background'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{fmtDate(s.startTime)} – {fmtTime(s.endTime)}
                          </div>
                        </div>
                        <button onClick={() => window.open(s.meetLink, '_blank')}
                          className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${s.status === 'LIVE' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                          <ExternalLink className="h-3.5 w-3.5" />{s.status === 'LIVE' ? 'Vào ngay' : 'Meet'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chưa có lịch học nào được lên kế hoạch.</p>
                )}
              </div>
            )}

            {/* Quiz section */}
            {activeLessonId && (
              <QuizSection
                key={activeLessonId}
                lessonId={activeLessonId}
                onComplete={() => {
                  setCompleted((p) => new Set([...p, activeLessonId]));
                }}
              />
            )}

            {/* Upcoming sessions below content */}
            {sessions.length > 0 && activeLesson.type !== 'LIVE' && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />Lịch học trực tuyến
                </h3>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div key={s.id} className={`rounded-lg border px-4 py-3 flex items-center gap-4 bg-background ${s.status === 'LIVE' ? 'border-red-300 ring-1 ring-red-300' : ''}`}>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted'}`}>
                        <Video className={`h-4 w-4 ${s.status === 'LIVE' ? 'text-red-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {s.title}
                          {s.status === 'LIVE' && <span className="text-xs font-bold text-red-600">● LIVE</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{fmtDate(s.startTime)} – {fmtTime(s.endTime)}
                          <span className="ml-2">· {s.creator.name}</span>
                        </div>
                      </div>
                      <button onClick={() => window.open(s.meetLink, '_blank')}
                        className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${s.status === 'LIVE' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                        <ExternalLink className="h-3.5 w-3.5" />{s.status === 'LIVE' ? 'Vào phòng học' : 'Google Meet'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {!completed.has(activeLessonId!) && activeLesson.type !== 'VIDEO' && (
                <Button onClick={markComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Đánh dấu hoàn thành
                </Button>
              )}
              <Button variant="outline" onClick={nextLesson}>Bài tiếp theo →</Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Chat panel overlay ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setChatOpen(false)}>
          <div
            className="w-full max-w-sm h-full bg-background border-l shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chat header */}
            <div className="h-14 px-4 border-b flex items-center gap-3 shrink-0">
              <MessageCircle className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Thảo luận khoá học</div>
                <div className="text-xs text-muted-foreground truncate">{course.title}</div>
              </div>
              <button onClick={() => setChatOpen(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {chatLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào.<br />Hãy là người đầu tiên thảo luận!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userId === user?.id;
                  const isMsgInstructor = msg.userId === course.instructor.id;
                  const canDelete = isInstructorOrAdmin || isMe;
                  return (
                    <div key={msg._id} className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : ''}`}>
                      <Avatar name={msg.userName} src={msg.avatarUrl} size={8} />
                      <div className={`flex-1 min-w-0 ${isMe ? 'flex flex-col items-end' : ''}`}>
                        <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{msg.userName}</span>
                          {isMsgInstructor && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">GV</span>
                          )}
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtChatTime(msg.createdAt)}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className={`rounded-2xl px-3 py-2 text-sm max-w-[220px] break-words ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'} ${isMsgInstructor && !isMe ? 'ring-1 ring-primary/20' : ''}`}>
                            {msg.content}
                          </div>
                          {canDelete && (
                            <button onClick={() => deleteMessage(msg._id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center shrink-0">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t shrink-0">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={500}
                />
                <button type="submit" disabled={!chatInput.trim() || sending}
                  className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-1.5">Tin nhắn hiển thị với tất cả thành viên khoá học</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
