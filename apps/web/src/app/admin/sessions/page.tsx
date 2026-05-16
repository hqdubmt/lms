'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Clock, Video, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface LiveSession {
  id: string; title: string; description?: string;
  startTime: string; endTime: string; meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  course?: { title: string }; class?: { name: string };
  creator: { name: string };
}

const STATUS_LABEL: Record<string, string> = { SCHEDULED: 'Sắp diễn ra', LIVE: 'Đang diễn ra', ENDED: 'Đã kết thúc' };
const STATUS_VARIANT: Record<string, any> = { SCHEDULED: 'outline', LIVE: 'default', ENDED: 'secondary' };

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.set('status', filter);
      const data = await api.get<{ sessions: LiveSession[]; total: number }>(`/admin/live-sessions?${params}`);
      setSessions(data.sessions);
      setTotal(data.total);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xóa buổi học "${title}"?`)) return;
    try { await api.delete(`/admin/live-sessions/${id}`); await load(); } catch {}
  };

  const handleStatusChange = async (id: string, status: string) => {
    try { await api.patch(`/admin/live-sessions/${id}`, { status }); await load(); } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lịch học</h1>
          <p className="text-sm text-muted-foreground">{total} buổi học</p>
        </div>
        <Button onClick={() => router.push('/admin/sessions/new')}>
          <Plus className="h-4 w-4 mr-2" />Tạo buổi học
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'SCHEDULED', 'LIVE', 'ENDED'].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s ? STATUS_LABEL[s] : 'Tất cả'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse"/>)}</div>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Chưa có buổi học nào</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className={s.status === 'LIVE' ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Video className={`h-5 w-5 ${s.status === 'LIVE' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-medium">{s.title}</span>
                    <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                    {s.course && <Badge variant="outline" className="text-xs">{s.course.title}</Badge>}
                    {s.class && <Badge variant="outline" className="text-xs">{s.class.name}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/>{fmtDT(s.startTime)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>→ {fmtDT(s.endTime)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick status change */}
                  <select className="text-xs border rounded px-2 py-1 bg-background"
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value)}>
                    <option value="SCHEDULED">Sắp diễn ra</option>
                    <option value="LIVE">Bắt đầu live</option>
                    <option value="ENDED">Kết thúc</option>
                  </select>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                    onClick={() => window.open(s.meetLink, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                    onClick={() => router.push(`/admin/sessions/${s.id}`)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(s.id, s.title)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
