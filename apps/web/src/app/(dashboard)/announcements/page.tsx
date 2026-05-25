'use client';

import { useEffect, useState } from 'react';
import { Bell, Pin, BookOpen, Users, Globe, CalendarDays, Megaphone, Check, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Topic = 'SYSTEM' | 'COURSE' | 'CLASS' | 'EVENT' | 'GENERAL';

interface Announcement {
  id: string;
  title: string;
  content: string;
  topic: Topic;
  isPinned: boolean;
  isRead: boolean;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string };
  course?: { id: string; title: string } | null;
  class?:  { id: string; name: string }  | null;
}

const TOPIC_META: Record<Topic, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  SYSTEM:  { label: 'Hệ thống',   icon: <Megaphone className="h-3.5 w-3.5" />,    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  COURSE:  { label: 'Khóa học',   icon: <BookOpen  className="h-3.5 w-3.5" />,    bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'  },
  CLASS:   { label: 'Lớp học',    icon: <Users     className="h-3.5 w-3.5" />,    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200'},
  EVENT:   { label: 'Sự kiện',    icon: <CalendarDays className="h-3.5 w-3.5" />, bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  GENERAL: { label: 'Chung',      icon: <Globe     className="h-3.5 w-3.5" />,    bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-200'  },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function TopicBadge({ topic }: { topic: Topic }) {
  const m = TOPIC_META[topic];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5', m.bg, m.text, m.border)}>
      {m.icon}{m.label}
    </span>
  );
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Topic | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = async (topic?: Topic | '') => {
    setLoading(true);
    try {
      const qs = topic ? `?topic=${topic}` : '';
      const data = await api.get<Announcement[]>(`/announcements${qs}`);
      setItems(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleOpen = async (item: Announcement) => {
    setExpanded(expanded === item.id ? null : item.id);
    if (!item.isRead) {
      try {
        await api.post(`/announcements/${item.id}/read`, {});
        setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, isRead: true } : a));
      } catch {}
    }
  };

  const handleMarkAll = async () => {
    setMarking(true);
    try {
      await api.post('/announcements/read-all', {});
      setItems((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch {}
    setMarking(false);
  };

  const unreadCount = items.filter((a) => !a.isRead).length;

  const TABS: { value: Topic | ''; label: string }[] = [
    { value: '', label: 'Tất cả' },
    { value: 'SYSTEM',  label: 'Hệ thống' },
    { value: 'COURSE',  label: 'Khóa học' },
    { value: 'CLASS',   label: 'Lớp học' },
    { value: 'EVENT',   label: 'Sự kiện' },
    { value: 'GENERAL', label: 'Chung' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6 text-indigo-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
            <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Tất cả đã đọc'}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} disabled={marking}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            <CheckCheck className="h-4 w-4" />Đọc tất cả
          </button>
        )}
      </div>

      {/* Topic filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              filter === t.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const meta = TOPIC_META[item.topic];
            const isOpen = expanded === item.id;
            return (
              <div key={item.id}
                className={cn(
                  'rounded-xl border transition-all cursor-pointer',
                  item.isPinned ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white',
                  !item.isRead && 'ring-2 ring-indigo-100',
                  'hover:shadow-sm',
                )}
                onClick={() => handleOpen(item)}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Unread dot */}
                  <div className="mt-1.5 shrink-0">
                    {!item.isRead
                      ? <span className="h-2 w-2 rounded-full bg-indigo-500 block" />
                      : <span className="h-2 w-2 rounded-full bg-transparent block" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {item.isPinned && <Pin className="h-3 w-3 text-amber-500 shrink-0" />}
                      <TopicBadge topic={item.topic} />
                      {item.course && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{item.course.title}</span>}
                      {item.class  && <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5">{item.class.name}</span>}
                    </div>
                    <p className={cn('text-sm font-semibold', item.isRead ? 'text-gray-700' : 'text-gray-900')}>{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.author.name} · {fmtDate(item.createdAt)}</p>
                  </div>

                  <Check className={cn('h-4 w-4 shrink-0 mt-1', item.isRead ? 'text-green-400' : 'text-gray-200')} />
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100 mt-1">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
