'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MonitorPlay, Video, Clock, Calendar, ExternalLink,
  RefreshCw, ChevronDown, Users, Wifi, WifiOff, CheckCircle2,
  Plus, X, Trash2, Edit2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  meetLink: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  course?: { id: string; title: string; slug: string };
  class?: { id: string; name: string };
  creator: { id?: string; name: string };
}

interface MyCourse {
  id: string;
  title: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });
}

function toLocalDatetimeValue(iso?: string) {
  if (!iso) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30, 0, 0);
    return now.toISOString().slice(0, 16);
  }
  return new Date(iso).toISOString().slice(0, 16);
}

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Đang bắt đầu...'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setRemaining(`${h}g ${m}p nữa`);
      else if (m > 0) setRemaining(`${m}p ${s}s nữa`);
      else setRemaining(`${s}s nữa`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetIso]);
  return remaining;
}

// ─── Session Form Modal ───────────────────────────────────────────────────────

interface SessionFormProps {
  courses: MyCourse[];
  editing?: LiveSession | null;
  onClose: () => void;
  onSaved: () => void;
}

function SessionFormModal({ courses, editing, onClose, onSaved }: SessionFormProps) {
  const [form, setForm] = useState({
    courseId: editing?.course?.id ?? (courses[0]?.id ?? ''),
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    startTime: toLocalDatetimeValue(editing?.startTime),
    endTime: toLocalDatetimeValue(editing?.endTime
      ? editing.endTime
      : (() => { const d = new Date(); d.setMinutes(d.getMinutes() + 90, 0, 0); return d.toISOString(); })()
    ),
    meetLink: editing?.meetLink ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.courseId) return setError('Vui lòng chọn khóa học');
    if (!form.meetLink) return setError('Vui lòng nhập link Google Meet');
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        meetLink: form.meetLink,
      };
      if (editing) {
        await api.patch(`/courses/sessions/${editing.id}`, body);
      } else {
        await api.post(`/courses/${form.courseId}/sessions`, body);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {editing ? 'Chỉnh sửa buổi học' : 'Tạo buổi học mới'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Buổi học trực tuyến qua Google Meet</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Course select */}
          {!editing && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Khóa học</label>
              <select
                value={form.courseId}
                onChange={(e) => set('courseId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">-- Chọn khóa học --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tiêu đề buổi học</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="VD: Buổi 1 - Giới thiệu khóa học"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mô tả <span className="text-gray-400 font-normal">(tuỳ chọn)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Nội dung buổi học..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bắt đầu</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kết thúc</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Meet link */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link Google Meet</label>
            <input
              type="url"
              value={form.meetLink}
              onChange={(e) => set('meetLink', e.target.value)}
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo buổi học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Live Card ────────────────────────────────────────────────────────────────

function LiveCard({ session, isOwner, onEdit, onDelete }: {
  session: LiveSession; isOwner: boolean;
  onEdit: (s: LiveSession) => void; onDelete: (id: string) => void;
}) {
  const join = () => window.open(session.meetLink, '_blank', 'noopener,noreferrer');
  return (
    <div className="relative rounded-3xl overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #7f1d1d 100%)' }}>
      <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 animate-pulse" />
      <div className="absolute -right-4 -bottom-8 w-36 h-36 rounded-full bg-white/5" />
      <div className="relative z-10 p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />ĐANG LIVE
            </span>
            <span className="text-white/60 text-xs">{fmtTime(session.startTime)} – {fmtTime(session.endTime)}</span>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={() => onEdit(session)} className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <Edit2 className="h-3.5 w-3.5 text-white" />
              </button>
              <button onClick={() => onDelete(session.id)} className="h-8 w-8 bg-white/20 hover:bg-red-500/60 rounded-xl flex items-center justify-center transition-colors">
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight mb-2">{session.title}</h2>
        {session.description && <p className="text-white/70 text-sm mb-2 line-clamp-2">{session.description}</p>}
        <p className="text-white/50 text-sm mb-7">
          {session.class?.name || session.course?.title || session.creator.name}
          {' · '}{session.creator.name}
        </p>
        <button onClick={join}
          className="flex items-center gap-3 bg-white text-red-600 hover:bg-red-50 font-bold text-base px-7 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg">
          <Video className="h-5 w-5" />Vào phòng học ngay<ExternalLink className="h-4 w-4 opacity-60" />
        </button>
      </div>
    </div>
  );
}

// ─── Upcoming Card (1:1 square) ──────────────────────────────────────────────

function UpcomingCard({ session, isOwner, onEdit, onDelete }: {
  session: LiveSession; isOwner: boolean;
  onEdit: (s: LiveSession) => void; onDelete: (id: string) => void;
}) {
  const countdown = useCountdown(session.startTime);
  const join = () => window.open(session.meetLink, '_blank', 'noopener,noreferrer');
  const d = new Date(session.startTime);
  const isToday = d.toDateString() === new Date().toDateString();
  const isSoon = d.getTime() - Date.now() < 30 * 60 * 1000;
  const dow = d.toLocaleDateString('vi-VN', { weekday: 'short' });
  const subtitle = session.class?.name || session.course?.title || session.creator.name;

  return (
    <div className={`relative bg-white rounded-2xl border overflow-hidden flex flex-col group transition-all hover:shadow-lg
      ${isSoon ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'}`}
      style={{ aspectRatio: '1/1' }}>

      {/* Top accent bar */}
      <div className={`h-1 w-full shrink-0 ${isToday ? 'bg-indigo-600' : isSoon ? 'bg-gradient-to-r from-indigo-400 to-purple-400' : 'bg-gray-100'}`} />

      {/* Owner actions */}
      {isOwner && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button onClick={() => onEdit(session)}
            className="h-6 w-6 bg-white rounded-lg shadow flex items-center justify-center hover:bg-indigo-50">
            <Edit2 className="h-3 w-3 text-indigo-600" />
          </button>
          <button onClick={() => onDelete(session.id)}
            className="h-6 w-6 bg-white rounded-lg shadow flex items-center justify-center hover:bg-red-50">
            <Trash2 className="h-3 w-3 text-red-500" />
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 min-h-0">
        {/* Date block */}
        <div className="flex items-end gap-1.5 mb-3">
          <span className={`text-3xl font-black leading-none ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
            {d.getDate().toString().padStart(2, '0')}
          </span>
          <div className="flex flex-col leading-none pb-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">{dow}</span>
            <span className="text-xs font-semibold text-gray-500">
              {d.toLocaleDateString('vi-VN', { month: 'short' })}
            </span>
          </div>
          {isToday && (
            <span className="ml-auto text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">HÔM NAY</span>
          )}
          {isOwner && !isToday && (
            <span className="ml-auto text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">CỦA TÔI</span>
          )}
        </div>

        {/* Title + subtitle */}
        <h3 className="font-bold text-sm leading-snug line-clamp-2 text-gray-900 mb-1 flex-1">{session.title}</h3>
        <p className="text-[11px] text-gray-400 truncate mb-3">{subtitle}</p>

        {/* Time */}
        <div className="text-xs font-semibold text-gray-600 mb-3">
          {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
        </div>

        {/* Countdown or join */}
        <div className="mt-auto">
          {isSoon && (
            <p className="text-[10px] font-bold text-indigo-500 mb-1.5">{countdown}</p>
          )}
          <button
            onClick={join}
            className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all
              ${isSoon
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            Vào Meet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ended Row ────────────────────────────────────────────────────────────────

function EndedRow({ session }: { session: LiveSession }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 opacity-60">
      <CheckCircle2 className="h-4 w-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-600 truncate block">{session.title}</span>
        <span className="text-xs text-muted-foreground">
          {session.class?.name || session.course?.title} · {fmtDateShort(session.startTime)}, {fmtTime(session.startTime)}
        </span>
      </div>
      <span className="text-xs text-gray-400 shrink-0">Đã kết thúc</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isInstructor, onAdd }: { isInstructor: boolean; onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <MonitorPlay className="h-8 w-8 text-gray-300" />
      </div>
      <p className="font-semibold text-gray-700">Không có buổi học nào</p>
      <p className="text-sm text-muted-foreground mt-1">Chưa có lịch học trực tuyến nào được lên kế hoạch</p>
      {isInstructor && (
        <button onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4" />Tạo buổi học đầu tiên
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useAuthStore();
  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [myCourses, setMyCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await api.get<LiveSession[]>('/users/schedule');
      setSessions(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  // Load instructor's courses for the form
  useEffect(() => {
    if (!isInstructor) return;
    api.get<any[]>('/courses/mine').then((data) => {
      setMyCourses((Array.isArray(data) ? data : []).map((c) => ({ id: c.id, title: c.title })));
    }).catch(() => {});
  }, [isInstructor]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Xóa buổi học này?')) return;
    try {
      await api.delete(`/courses/sessions/${sessionId}`);
      load(true);
    } catch {}
  };

  const handleEdit = (session: LiveSession) => {
    setEditing(session);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const live = sessions.filter((s) => s.status === 'LIVE');
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED');
  const ended = sessions.filter((s) => s.status === 'ENDED');


  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Hero ── */}
      <div className="px-6 py-7 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)' }}>
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Phòng học</h1>
            <p className="text-white/60 text-sm mt-1">
              {live.length > 0
                ? `${live.length} buổi học đang diễn ra`
                : upcoming.length > 0
                  ? `${upcoming.length} buổi học sắp tới`
                  : 'Không có buổi học nào'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
              {live.length > 0
                ? <><Wifi className="h-4 w-4 text-green-400" /><span className="text-xs text-white/80 font-medium">Có LIVE</span></>
                : <><WifiOff className="h-4 w-4 text-white/40" /><span className="text-xs text-white/40">Chưa có LIVE</span></>}
            </div>
            {isInstructor && (
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                <Plus className="h-4 w-4" />Tạo buổi học
              </button>
            )}
            <button onClick={() => load(true)} disabled={refreshing}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors">
              <RefreshCw className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl bg-gray-200 animate-pulse" style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        ) : live.length === 0 && upcoming.length === 0 && ended.length === 0 ? (
          <EmptyState isInstructor={isInstructor} onAdd={openCreate} />
        ) : (
          <>
            {/* ── LIVE ── */}
            {live.length > 0 && (
              <section className="space-y-4">
                {live.map((s) => (
                  <LiveCard key={s.id} session={s}
                    isOwner={isInstructor && s.creator?.id === user?.id}
                    onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </section>
            )}

            {/* ── Upcoming grid 1:1 ── */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />Sắp tới ({upcoming.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {upcoming.map((s) => (
                    <UpcomingCard key={s.id} session={s}
                      isOwner={isInstructor && s.creator?.id === user?.id}
                      onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Ended ── */}
            {ended.length > 0 && (
              <section>
                <button onClick={() => setShowEnded(!showEnded)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gray-700 transition-colors w-full text-left py-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${showEnded ? 'rotate-180' : ''}`} />
                  Buổi học đã kết thúc ({ended.length})
                </button>
                {showEnded && (
                  <div className="bg-white rounded-2xl border border-gray-100 px-5 mt-2">
                    {ended.map((s) => <EndedRow key={s.id} session={s} />)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {showForm && (
        <SessionFormModal
          courses={myCourses}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}
