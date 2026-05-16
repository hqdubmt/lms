'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Video, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface LiveSession {
  id: string; title: string; description?: string;
  startTime: string; endTime: string; meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  course?: { id: string; title: string; slug: string };
  class?: { id: string; name: string };
  creator: { name: string };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(sessions: LiveSession[]) {
  const map = new Map<string, LiveSession[]>();
  for (const s of sessions) {
    const day = new Date(s.startTime).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    map.set(day, [...(map.get(day) || []), s]);
  }
  return map;
}

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Sắp diễn ra', variant: 'outline' as const, cls: '' },
  LIVE: { label: '🔴 Đang diễn ra', variant: 'default' as const, cls: 'animate-pulse' },
  ENDED: { label: 'Đã kết thúc', variant: 'secondary' as const, cls: 'opacity-60' },
};

export default function SchedulePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await api.get<LiveSession[]>('/users/schedule');
      setSessions(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const grouped = groupByDate(sessions.filter((s) => s.status !== 'ENDED'));
  const ended = sessions.filter((s) => s.status === 'ENDED');

  if (loading) return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lịch học</h1>
          <p className="text-sm text-muted-foreground">Các buổi học trực tuyến của bạn</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {grouped.size === 0 && ended.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Không có buổi học nào được lên lịch</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {[...grouped.entries()].map(([date, list]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />{date}
              </h2>
              <div className="space-y-3">
                {list.map((session) => {
                  const cfg = STATUS_CONFIG[session.status];
                  return (
                    <Card key={session.id} className={`overflow-hidden ${session.status === 'LIVE' ? 'ring-2 ring-primary' : ''}`}>
                      {session.status === 'LIVE' && <div className="h-1 bg-primary" />}
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${session.status === 'LIVE' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Video className={`h-6 w-6 ${session.status === 'LIVE' ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-semibold">{session.title}</h3>
                              <Badge variant={cfg.variant} className={cfg.cls}>{cfg.label}</Badge>
                              {session.course && <Badge variant="outline" className="text-xs">{session.course.title}</Badge>}
                              {session.class && <Badge variant="outline" className="text-xs">{session.class.name}</Badge>}
                            </div>
                            {session.description && <p className="text-sm text-muted-foreground mb-2">{session.description}</p>}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime(session.startTime)} – {formatTime(session.endTime)}</span>
                              <span>Giảng viên: {session.creator.name}</span>
                            </div>
                          </div>
                          {session.status === 'LIVE' && (
                            <Button onClick={() => window.open(session.meetLink, '_blank')} className="shrink-0">
                              <ExternalLink className="h-4 w-4 mr-2" />Vào phòng học
                            </Button>
                          )}
                          {session.status === 'SCHEDULED' && (
                            <Button variant="outline" size="sm" onClick={() => window.open(session.meetLink, '_blank')} className="shrink-0">
                              <ExternalLink className="h-4 w-4 mr-1" />Link Meet
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {ended.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none flex items-center gap-2 py-2">
                <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                Buổi học đã kết thúc ({ended.length})
              </summary>
              <div className="mt-3 space-y-2 opacity-60">
                {ended.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{session.title}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(session.startTime)}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">Đã kết thúc</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
