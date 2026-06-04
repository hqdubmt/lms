'use client';

import { useEffect, useState } from 'react';
import { Calendar, MessageSquare, ClipboardList, BookOpen, Mic, Trophy, Flame, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeline, type TimelineData, type TimelineEvent, type TimelineEventType } from '@/services/gamification';

const EVENT_CONFIG: Record<TimelineEventType, { icon: React.ElementType; color: string; bg: string }> = {
  chat:        { icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  quiz:        { icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  homework:    { icon: BookOpen,      color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  voice:       { icon: Mic,           color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  achievement: { icon: Trophy,        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  streak:      { icon: Flame,         color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
};

const EVENT_LABELS: Record<TimelineEventType, string> = {
  chat: 'Chat AI', quiz: 'Quiz', homework: 'Bài tập', voice: 'Voice', achievement: 'Thành tích', streak: 'Streak',
};

const DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return 'Hôm nay';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function EventCard({ event }: { event: TimelineEvent }) {
  const cfg = EVENT_CONFIG[event.type];
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-xl border', cfg.bg)}>
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-white border', cfg.bg)}>
        <Icon className={cn('h-4 w-4', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
        {event.score !== undefined && (
          <span className="text-xs font-bold text-emerald-600 mt-1 inline-block">Điểm: {event.score}/10</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{formatTime(event.time)}</span>
    </div>
  );
}

export default function TimelinePage() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<typeof DAYS_OPTIONS[number]>(30);

  const load = async (d: typeof DAYS_OPTIONS[number]) => {
    setLoading(true);
    try {
      setData(await getTimeline(d));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalEvents = data ? Object.values(data.stats).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Lịch sử học tập
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Timeline hoạt động của bạn</p>
        </div>
        <button onClick={() => load(days)} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Days selector */}
      <div className="flex flex-wrap gap-2">
        {DAYS_OPTIONS.map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              days === d ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}>
            {d} ngày
          </button>
        ))}
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-primary">{totalEvents}</p>
            <p className="text-xs text-muted-foreground">Sự kiện</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-violet-600">{data.timeline.length}</p>
            <p className="text-xs text-muted-foreground">Ngày học</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl font-bold text-amber-600">{data.stats.achievement}</p>
            <p className="text-xs text-muted-foreground">Thành tích</p>
          </div>
        </div>
      )}

      {/* Event type legend */}
      {data && totalEvents > 0 && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(data.stats) as TimelineEventType[]).filter(t => data.stats[t] > 0).map(type => {
            const cfg = EVENT_CONFIG[type];
            return (
              <span key={type} className={cn('text-xs font-medium px-3 py-1 rounded-full border flex items-center gap-1.5', cfg.bg)}>
                <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                {EVENT_LABELS[type]}: {data.stats[type]}
              </span>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải timeline...
        </div>
      ) : !data || data.timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-600">Chưa có hoạt động nào</p>
          <p className="text-xs text-muted-foreground mt-1">
            Bắt đầu học với AI Tutor, làm quiz hoặc nộp bài tập để xây dựng timeline học tập.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {data.timeline.map(day => (
            <div key={day.date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {formatDate(day.date)}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-muted-foreground">{day.events.length} sự kiện</span>
              </div>
              <div className="space-y-2">
                {day.events.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
