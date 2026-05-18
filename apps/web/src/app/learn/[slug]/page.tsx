'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown, ChevronRight, Play, FileText, CheckCircle2,
  ArrowLeft, Loader2, Lock, ExternalLink, Calendar, Clock, Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface Lesson {
  id: string; title: string; type: string; order: number;
  isFree: boolean; isPublished: boolean; videoDuration?: number;
}
interface Section { id: string; title: string; order: number; lessons: Lesson[] }
interface Course {
  id: string; title: string; slug: string; sections: Section[];
  instructor: { name: string };
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

export default function LearnPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [showSessions, setShowSessions] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonDetail | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());

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
      const lessonId = searchParams.get('lesson');
      const firstLesson = courseData.sections[0]?.lessons[0];
      const target = lessonId || firstLesson?.id;
      if (target) openLesson(target);
    }).catch(() => router.replace('/dashboard'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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

  if (!course) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const totalLessons = course.sections.flatMap((s) => s.lessons).length;
  const completedCount = completed.size;
  const liveSessions = sessions.filter((s) => s.status === 'LIVE');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-72 border-r bg-background flex flex-col shrink-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 px-4 border-b flex items-center gap-3 shrink-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{course.title}</div>
            <div className="text-xs text-muted-foreground">{completedCount}/{totalLessons} bài</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted shrink-0">
          <div className="h-full bg-primary transition-all" style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Live sessions section ── */}
          {sessions.length > 0 && (
            <div className="border-b">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/5 hover:bg-primary/10 text-sm font-medium text-left"
              >
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 text-primary">Lịch học trực tuyến</span>
                {liveSessions.length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                )}
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
                            {session.status === 'LIVE' && (
                              <span className="text-xs font-semibold text-red-600 shrink-0">● LIVE</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.status === 'LIVE'
                              ? `Đến ${fmtTime(session.endTime)}`
                              : fmtDate(session.startTime)
                            }
                          </div>
                          <button
                            onClick={() => window.open(session.meetLink, '_blank')}
                            className={`mt-1.5 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md w-full justify-center transition-colors ${
                              session.status === 'LIVE'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
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

          {/* ── Lesson list ── */}
          {course.sections.map((section) => (
            <div key={section.id}>
              <button
                onClick={() => setExpanded((p) => ({ ...p, [section.id]: !p[section.id] }))}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/70 text-sm font-medium text-left border-b"
              >
                {expanded[section.id] ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <span className="flex-1 truncate">{section.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{section.lessons.length}</span>
              </button>
              {expanded[section.id] && section.lessons.map((lesson) => {
                const Icon = LESSON_ICON[lesson.type] || Play;
                const isActive = lesson.id === activeLessonId;
                const isDone = completed.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => openLesson(lesson.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors border-b border-muted/50 ${
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'
                    }`}
                  >
                    {isDone
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    }
                    <span className="flex-1 truncate leading-snug">{lesson.title}</span>
                    {lesson.videoDuration && (
                      <span className="text-xs text-muted-foreground shrink-0">{formatDuration(lesson.videoDuration)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {/* LIVE banner */}
        {liveSessions.length > 0 && (
          <div className="bg-red-600 text-white px-6 py-3 flex items-center gap-4">
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">Đang có buổi học trực tuyến: </span>
              <span className="text-sm opacity-90">{liveSessions[0].title}</span>
            </div>
            <button
              onClick={() => window.open(liveSessions[0].meetLink, '_blank')}
              className="shrink-0 bg-white text-red-600 hover:bg-red-50 font-semibold text-sm px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />Vào phòng học
            </button>
          </div>
        )}

        {loadingLesson ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !activeLesson ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Chọn bài học để bắt đầu
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            {/* Lesson title */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">{activeLesson.title}</h1>
                {activeLesson.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activeLesson.description}</p>
                )}
              </div>
              <Badge variant={completed.has(activeLessonId!) ? 'default' : 'outline'}>
                {completed.has(activeLessonId!) ? '✓ Hoàn thành' : activeLesson.type}
              </Badge>
            </div>

            {/* Video player */}
            {activeLesson.type === 'VIDEO' && (
              activeLesson.videoUrl ? (
                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    key={activeLesson.videoUrl}
                    className="w-full h-full"
                    controls
                    autoPlay={false}
                    src={activeLesson.videoUrl.startsWith('/api/') && accessToken
                      ? `${activeLesson.videoUrl}?token=${accessToken}`
                      : activeLesson.videoUrl}
                    onEnded={markComplete}
                  />
                </div>
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

            {/* Live lesson type */}
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
                        <button
                          onClick={() => window.open(s.meetLink, '_blank')}
                          className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            s.status === 'LIVE'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {s.status === 'LIVE' ? 'Vào ngay' : 'Meet'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chưa có lịch học nào được lên kế hoạch.</p>
                )}
              </div>
            )}

            {/* Upcoming sessions below content */}
            {sessions.length > 0 && activeLesson.type !== 'LIVE' && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />Lịch học trực tuyến của khóa học
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
                      <button
                        onClick={() => window.open(s.meetLink, '_blank')}
                        className={`shrink-0 flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          s.status === 'LIVE'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {s.status === 'LIVE' ? 'Vào phòng học' : 'Google Meet'}
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
    </div>
  );
}
