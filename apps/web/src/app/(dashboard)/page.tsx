'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, School, ChevronRight, Loader2, Video } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

interface Stats {
    classes: number;
    courses: number;
    activeCourses: number;
}

interface UpcomingSession {
    id: string;
    title: string;
    startTime: string;
    status: 'SCHEDULED' | 'LIVE';
    class?: { name: string };
    course?: { title: string };
}

function fmtDT(iso: string) {
    return new Date(iso).toLocaleString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<Stats>({ classes: 0, courses: 0, activeCourses: 0 });
    const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [enrollData, classData, scheduleData] = await Promise.all([
                    api.get<any>('/users/enrollments'),
                    api.get<any[]>('/users/classes').catch(() => []),
                    api.get<UpcomingSession[]>('/users/schedule').catch(() => []),
                ]);
                const enrollList = Array.isArray(enrollData) ? enrollData : enrollData?.enrollments || [];
                const classList = Array.isArray(classData) ? classData : [];
                const scheduleList = Array.isArray(scheduleData) ? scheduleData : [];

                setStats({
                    classes: classList.length,
                    courses: enrollList.length,
                    activeCourses: enrollList.filter((e: any) => e.status === 'ACTIVE').length,
                });
                setUpcoming(scheduleList.filter((s) => s.status !== 'ENDED' as any).slice(0, 3));
            } catch { }
            setLoading(false);
        };
        load();
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    return (
        <div className="p-6 space-y-6 max-w-4xl">
            {/* Welcome */}
            <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)' }}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-white/70 text-sm mb-1">{greeting} 👋</p>
                        <h1 className="text-2xl font-bold">{user?.name}</h1>
                        <p className="text-white/60 text-sm mt-1">Tiếp tục hành trình học tập của bạn hôm nay</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                    </div>
                </div>

                {/* Quick stats */}
                {loading ? (
                    <div className="mt-5 flex gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 w-28 rounded-xl bg-white/10 animate-pulse" />)}
                    </div>
                ) : (
                    <div className="mt-5 flex gap-3 flex-wrap">
                        {[
                            { label: 'Lớp học', value: stats.classes, icon: School },
                            { label: 'Khoá học', value: stats.courses, icon: BookOpen },
                            { label: 'Đang học', value: stats.activeCourses, icon: BookOpen },
                        ].map((s) => (
                            <div key={s.label} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-3 min-w-[100px]">
                                <s.icon className="h-5 w-5 text-white/60 shrink-0" />
                                <div>
                                    <div className="text-lg font-bold text-white leading-none">{s.value}</div>
                                    <div className="text-[11px] text-white/50 mt-0.5">{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
                <Link href="/courses"
                    className="bg-white rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow border border-gray-100">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">Khoá học của tôi</div>
                        <div className="text-xs text-muted-foreground">Xem lớp học & tiến độ</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>

                <Link href="/schedule"
                    className="bg-white rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow border border-gray-100">
                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">Lịch học</div>
                        <div className="text-xs text-muted-foreground">Buổi học trực tuyến</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
            </div>

            {/* Upcoming sessions */}
            {!loading && upcoming.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            Buổi học sắp tới
                        </h2>
                        <Link href="/schedule" className="text-xs text-primary hover:underline">Xem tất cả</Link>
                    </div>
                    <div className="space-y-2">
                        {upcoming.map((s) => (
                            <div key={s.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'LIVE' ? 'bg-red-50' : 'bg-primary/8'}`}>
                                    <Video className={`h-4 w-4 ${s.status === 'LIVE' ? 'text-red-500' : 'text-primary'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{s.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {s.class?.name || s.course?.title} · {fmtDT(s.startTime)}
                                    </div>
                                </div>
                                {s.status === 'LIVE' && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">LIVE</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
