'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, BookOpen, MonitorPlay, Settings, GraduationCap, LogOut, ChevronRight,
    Bell, Check, Video, BookMarked, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { api } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notif {
    id: string;
    type: 'SESSION_LIVE' | 'SESSION_UPCOMING' | 'COURSE_UPDATE' | 'ENROLLMENT';
    title: string;
    body: string;
    readAt?: string | null;
    createdAt: string;
    link?: string;
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const navGroups = [
    {
        label: 'HỌC TẬP',
        items: [
            { href: '/dashboard', label: 'Trang chủ', icon: Home, exact: true },
            { href: '/courses', label: 'Khoá học', icon: BookOpen },
            { href: '/schedule', label: 'Phòng học', icon: MonitorPlay },
        ],
    },
    {
        label: 'CÁ NHÂN',
        items: [
            { href: '/settings', label: 'Cài đặt', icon: Settings },
        ],
    },
];

// ─── Notification Bell ────────────────────────────────────────────────────────

function NotifIcon(type: string) {
    if (type === 'SESSION_LIVE' || type === 'SESSION_UPCOMING') return Video;
    if (type === 'ENROLLMENT') return GraduationCap;
    return BookMarked;
}

function fmtRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Lấy thông báo từ schedule (buổi học sắp tới / đang live)
        api.get<any[]>('/users/schedule').then((data) => {
            const list = Array.isArray(data) ? data : [];
            const mapped: Notif[] = list
                .filter((s) => s.status !== 'ENDED')
                .slice(0, 8)
                .map((s) => ({
                    id: s.id,
                    type: s.status === 'LIVE' ? 'SESSION_LIVE' : 'SESSION_UPCOMING',
                    title: s.status === 'LIVE' ? '🔴 Đang diễn ra' : '📅 Buổi học sắp tới',
                    body: s.title + (s.class?.name ? ` · ${s.class.name}` : s.course?.title ? ` · ${s.course.title}` : ''),
                    createdAt: s.startTime,
                    link: '/schedule',
                }));
            setNotifs(mapped);
        }).catch(() => setNotifs([])).finally(() => setLoading(false));
    }, []);

    const unread = notifs.length;

    return (
        <div className="absolute left-full top-0 ml-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-sm text-gray-900">Thông báo</span>
                    {unread > 0 && (
                        <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">{unread}</span>
                    )}
                </div>
                <button onClick={onClose} className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
                {loading ? (
                    <div className="py-10 flex justify-center">
                        <div className="h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    </div>
                ) : notifs.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Không có thông báo nào
                    </div>
                ) : (
                    notifs.map((n) => {
                        const Icon = NotifIcon(n.type);
                        const isLive = n.type === 'SESSION_LIVE';
                        return (
                            <Link
                                key={n.id}
                                href={n.link || '/schedule'}
                                onClick={onClose}
                                className={cn(
                                    'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                                    isLive && 'bg-red-50 hover:bg-red-100',
                                )}
                            >
                                <div className={cn(
                                    'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                                    isLive ? 'bg-red-100' : 'bg-indigo-50',
                                )}>
                                    <Icon className={cn('h-4 w-4', isLive ? 'text-red-500' : 'text-indigo-600')} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn('text-xs font-semibold', isLive ? 'text-red-600' : 'text-indigo-600')}>{n.title}</p>
                                    <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{n.body}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{fmtRelative(n.createdAt)}</p>
                                </div>
                                {isLive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0 mt-2" />}
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <Link href="/schedule" onClick={onClose}
                className="block px-4 py-3 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors">
                Xem tất cả →
            </Link>
        </div>
    );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, accessToken, fetchMe, logout } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [showNotif, setShowNotif] = useState(false);
    const [liveCount, setLiveCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user && accessToken) fetchMe();
        else if (!user && !accessToken) router.replace('/login');
    }, [user, accessToken, fetchMe, router]);

    // Poll for live sessions count
    useEffect(() => {
        if (!user) return;
        const check = () => {
            api.get<any[]>('/users/schedule').then((data) => {
                const list = Array.isArray(data) ? data : [];
                setLiveCount(list.filter((s) => s.status === 'LIVE').length);
            }).catch(() => {});
        };
        check();
        const t = setInterval(check, 30_000);
        return () => clearInterval(t);
    }, [user]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!user) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex bg-[#f1f5f9]">
            {/* Sidebar */}
            <aside className="w-56 shrink-0 flex flex-col min-h-screen sticky top-0 h-screen" style={{ background: '#0f172a' }}>
                {/* Logo */}
                <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/10 shrink-0">
                    {siteConfig.logoUrl ? (
                        <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain" />
                    ) : (
                        <>
                            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                <GraduationCap className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-white text-sm">{siteConfig.name}</span>
                        </>
                    )}
                </div>

                {/* Nav groups */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            <div className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const active = item.exact
                                        ? pathname === item.href
                                        : pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                                active
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'text-white/55 hover:bg-white/8 hover:text-white',
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            <span className="truncate">{item.label}</span>
                                            {active && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-70" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bell + User info */}
                <div className="p-3 border-t border-white/10 shrink-0 space-y-1">
                    {/* Notification bell */}
                    <div ref={notifRef} className="relative">
                        <button
                            onClick={() => setShowNotif(!showNotif)}
                            className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                showNotif ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white',
                            )}
                        >
                            <div className="relative">
                                <Bell className="h-4 w-4 shrink-0" />
                                {liveCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                        <span className="text-[7px] text-white font-bold leading-none">{liveCount}</span>
                                    </span>
                                )}
                            </div>
                            <span className="truncate">Thông báo</span>
                            {liveCount > 0 && (
                                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                    {liveCount} LIVE
                                </span>
                            )}
                        </button>

                        {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} />}
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-2.5 px-2 py-1.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 overflow-hidden">
                            {user.avatarUrl
                                ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                                : <span className="text-sm font-semibold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                            <div className="text-[10px] text-white/35 truncate">{user.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:bg-white/8 hover:text-white/80 transition-colors"
                    >
                        <LogOut className="h-3.5 w-3.5" />Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto min-h-screen">{children}</main>
        </div>
    );
}
