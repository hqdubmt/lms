'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, BookOpen, MonitorPlay, Settings, GraduationCap, LogOut, ChevronRight,
    Bell, Video, BookMarked, X, Menu, ChevronLeft, Globe, Calculator, BookType,
    Image as ImageIcon, Gamepad2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { api } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';
import { AiChat } from '@/components/ai/AiChat';

interface Notif {
    id: string;
    type: 'SESSION_LIVE' | 'SESSION_UPCOMING' | 'COURSE_UPDATE' | 'ENROLLMENT';
    title: string;
    body: string;
    readAt?: string | null;
    createdAt: string;
    link?: string;
}

const BASE_NAV_GROUPS = [
    {
        label: 'HỌC TẬP',
        items: [
            { href: '/dashboard',      label: 'Trang chủ',  icon: Home,          exact: true },
            { href: '/courses',        label: 'Khoá học',   icon: BookOpen },
            { href: '/media',          label: 'Thư viện',   icon: ImageIcon },
            { href: '/language',       label: 'Ngoại ngữ',  icon: Globe },
            { href: '/math',           label: 'Toán học',   icon: Calculator },
            { href: '/viet',           label: 'Tiếng Việt', icon: BookType },
            { href: '/quiz',           label: 'Quiz Game',  icon: Gamepad2 },
            { href: '/announcements',  label: 'Thông báo',  icon: Bell },
            { href: '/schedule',       label: 'Phòng học',  icon: MonitorPlay },
        ],
    },
    {
        label: 'CÁ NHÂN',
        items: [
            { href: '/settings', label: 'Cài đặt', icon: Settings },
        ],
    },
];

const INSTRUCTOR_HREF_MAP: Record<string, string> = {
    '/language':     '/instructor/language',
    '/math':         '/instructor/math',
    '/viet':         '/instructor/viet',
    '/media':        '/instructor/media',
    '/quiz':         '/instructor/quiz',
    '/announcements':'/instructor/announcements',
};

function getNavGroups(role?: string) {
    if (role === 'INSTRUCTOR' || role === 'ADMIN') {
        return BASE_NAV_GROUPS.map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                href: INSTRUCTOR_HREF_MAP[item.href] ?? item.href,
            })),
        }));
    }
    return BASE_NAV_GROUPS;
}

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

function NotificationDropdown({ onClose, collapsed }: { onClose: () => void; collapsed: boolean }) {
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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

    return (
        <div className={cn(
            'absolute bottom-0 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden',
            collapsed ? 'left-full ml-2' : 'left-full ml-2',
            'sm:left-full sm:ml-2',
            // on mobile fall back to fixed bottom sheet
            'max-sm:fixed max-sm:inset-x-3 max-sm:bottom-16 max-sm:left-3 max-sm:w-auto',
        )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-sm">Thông báo</span>
                    {notifs.length > 0 && (
                        <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">{notifs.length}</span>
                    )}
                </div>
                <button onClick={onClose} className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
                {loading ? (
                    <div className="py-10 flex justify-center">
                        <div className="h-5 w-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    </div>
                ) : notifs.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Không có thông báo nào
                    </div>
                ) : notifs.map((n) => {
                    const Icon = NotifIcon(n.type);
                    const isLive = n.type === 'SESSION_LIVE';
                    return (
                        <Link key={n.id} href={n.link || '/schedule'} onClick={onClose}
                            className={cn(
                                'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors',
                                isLive && 'bg-red-50 hover:bg-red-100',
                            )}>
                            <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', isLive ? 'bg-red-100' : 'bg-indigo-50')}>
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
                })}
            </div>
            <Link href="/schedule" onClick={onClose}
                className="block px-4 py-3 text-center text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border-t border-gray-100 transition-colors">
                Xem tất cả →
            </Link>
        </div>
    );
}

// ─── Tooltip (for collapsed icon mode) ───────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="relative group/tip flex">
            {children}
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({
    user, pathname, liveCount, showNotif, setShowNotif,
    notifRef, onLogout, collapsed, onToggle, navGroups, logoBg, logoBgHeight, badges,
}: {
    user: any; pathname: string; liveCount: number;
    showNotif: boolean; setShowNotif: (v: boolean) => void;
    notifRef: React.RefObject<HTMLDivElement>;
    onLogout: () => void; collapsed: boolean; onToggle: () => void;
    navGroups: ReturnType<typeof getNavGroups>;
    logoBg: string; logoBgHeight: number;
    badges: Record<string, number>;
}) {
    return (
        <aside
            className={cn(
                'hidden lg:flex flex-col min-h-screen sticky top-0 h-screen shrink-0 transition-all duration-300 relative',
                collapsed ? 'w-[60px]' : 'w-56',
            )}
            style={{ background: '#0f172a' }}
        >
            {/* ── Toggle tab — sticks out on the right edge ── */}
            <button
                onClick={onToggle}
                title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                className={cn(
                    'absolute top-1/2 -translate-y-1/2 z-10',
                    'flex items-center justify-center',
                    'w-5 h-10 rounded-r-lg',
                    'bg-[#1e293b] hover:bg-[#334155]',
                    'border border-l-0 border-white/10',
                    'text-white/50 hover:text-white',
                    'transition-all duration-200',
                    '-right-5',  // sticks out 20px to the right
                )}
            >
                <ChevronLeft className={cn(
                    'h-3 w-3 transition-transform duration-300',
                    collapsed && 'rotate-180',
                )} />
            </button>

            {/* Logo row */}
            <div
                className={cn(
                    'flex items-center border-b border-white/10 shrink-0 overflow-hidden px-3',
                    !logoBgHeight && 'h-14',
                )}
                style={logoBg ? { background: logoBg, ...(logoBgHeight ? { height: logoBgHeight } : {}) } : undefined}
            >
                {collapsed ? (
                    <div className="h-7 w-7 rounded-lg bg-primary/80 flex items-center justify-center mx-auto">
                        <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                ) : siteConfig.logoUrl ? (
                    <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain mx-auto" />
                ) : logoBg ? null : (
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                            <GraduationCap className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-bold text-white text-sm truncate">{siteConfig.name}</span>
                    </div>
                )}
            </div>

            {/* Nav groups */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-2">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        {!collapsed && (
                            <div className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">
                                {group.label}
                            </div>
                        )}
                        {collapsed && <div className="h-px bg-white/10 mx-1 mb-2" />}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const active = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href);
                                const badge = badges[item.href] || 0;

                                const linkEl = (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all',
                                            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2 w-full',
                                            active
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-white/55 hover:bg-white/8 hover:text-white',
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <item.icon className="h-4 w-4" />
                                            {badge > 0 && collapsed && (
                                                <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 text-[8px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">{badge}</span>
                                            )}
                                        </div>
                                        {!collapsed && (
                                            <>
                                                <span className="truncate">{item.label}</span>
                                                {badge > 0 ? (
                                                    <span className="ml-auto text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full shrink-0">{badge}</span>
                                                ) : active ? (
                                                    <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-70" />
                                                ) : null}
                                            </>
                                        )}
                                    </Link>
                                );

                                return collapsed
                                    ? <Tooltip key={item.href} label={item.label}>{linkEl}</Tooltip>
                                    : <div key={item.href}>{linkEl}</div>;
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bell + User */}
            <div className="border-t border-white/10 shrink-0 p-2 space-y-1">
                {/* Bell */}
                <div ref={notifRef} className="relative">
                    {collapsed ? (
                        <Tooltip label="Thông báo">
                            <button
                                onClick={() => setShowNotif(!showNotif)}
                                className={cn(
                                    'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors relative',
                                    showNotif ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white',
                                )}
                            >
                                <Bell className="h-4 w-4" />
                                {liveCount > 0 && (
                                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </button>
                        </Tooltip>
                    ) : (
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
                    )}
                    {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} collapsed={collapsed} />}
                </div>

                {/* User */}
                {collapsed ? (
                    <Tooltip label={user.name}>
                        <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden cursor-default">
                            {user.avatarUrl
                                ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                                : <span className="text-sm font-semibold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                            }
                        </div>
                    </Tooltip>
                ) : (
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
                )}

                {/* Logout */}
                {collapsed ? (
                    <Tooltip label="Đăng xuất">
                        <button
                            onClick={onLogout}
                            className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white/80 transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </button>
                    </Tooltip>
                ) : (
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:bg-white/8 hover:text-white/80 transition-colors"
                    >
                        <LogOut className="h-3.5 w-3.5" />Đăng xuất
                    </button>
                )}
            </div>
        </aside>
    );
}

// ─── Mobile Drawer Sidebar ────────────────────────────────────────────────────

function MobileSidebar({
    user, pathname, liveCount, showNotif, setShowNotif,
    notifRef, onNavClick, onLogout, open, onClose, navGroups, logoBg, logoBgHeight,
}: {
    user: any; pathname: string; liveCount: number;
    showNotif: boolean; setShowNotif: (v: boolean) => void;
    notifRef: React.RefObject<HTMLDivElement>;
    onNavClick: () => void; onLogout: () => void;
    open: boolean; onClose: () => void;
    navGroups: ReturnType<typeof getNavGroups>;
    logoBg: string; logoBgHeight: number;
}) {
    return (
        <>
            {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
            <aside
                className={cn(
                    'fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 lg:hidden',
                    open ? 'translate-x-0' : '-translate-x-full',
                )}
                style={{ background: '#0f172a' }}
            >
                <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:text-white">
                    <X className="h-4 w-4" />
                </button>

                {/* Logo */}
                <div
                    className={cn(
                        'flex items-center gap-2.5 px-4 border-b border-white/10 shrink-0 overflow-hidden',
                        !logoBgHeight && 'h-14',
                    )}
                    style={logoBg ? { background: logoBg, ...(logoBgHeight ? { height: logoBgHeight } : {}) } : undefined}
                >
                    {siteConfig.logoUrl ? (
                        <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain mx-auto" />
                    ) : logoBg ? null : (
                        <>
                            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                <GraduationCap className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-white text-sm">{siteConfig.name}</span>
                        </>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            <div className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">{group.label}</div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                    return (
                                        <Link key={item.href} href={item.href} onClick={onNavClick}
                                            className={cn(
                                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                                active ? 'bg-primary text-white shadow-sm' : 'text-white/55 hover:bg-white/8 hover:text-white',
                                            )}>
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

                {/* Bell + User */}
                <div className="p-3 border-t border-white/10 shrink-0 space-y-1">
                    <div ref={notifRef} className="relative">
                        <button onClick={() => setShowNotif(!showNotif)}
                            className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                showNotif ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white')}>
                            <Bell className="h-4 w-4 shrink-0" />
                            <span className="truncate">Thông báo</span>
                            {liveCount > 0 && (
                                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">{liveCount} LIVE</span>
                            )}
                        </button>
                        {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} collapsed={false} />}
                    </div>
                    <div className="flex items-center gap-2.5 px-2 py-1.5">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 overflow-hidden">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold text-white">{user?.name?.[0]?.toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                            <div className="text-[10px] text-white/35 truncate">{user.email}</div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:bg-white/8 hover:text-white/80 transition-colors">
                        <LogOut className="h-3.5 w-3.5" />Đăng xuất
                    </button>
                </div>
            </aside>
        </>
    );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

const COLLAPSED_KEY = 'sidebar_collapsed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, accessToken, _hasHydrated, fetchMe, logout } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [showNotif, setShowNotif] = useState(false);
    const [liveCount, setLiveCount] = useState(0);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const branding = useBranding();

    // Restore collapsed state from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(COLLAPSED_KEY);
        if (saved === 'true') setCollapsed(true);
    }, []);

    const handleToggle = () => {
        setCollapsed((prev) => {
            localStorage.setItem(COLLAPSED_KEY, String(!prev));
            return !prev;
        });
    };

    useEffect(() => {
        if (!_hasHydrated) return;
        if (!user && accessToken) fetchMe();
        else if (!user && !accessToken) router.replace('/login');
    }, [user, accessToken, _hasHydrated, fetchMe, router]);

    useEffect(() => {
        if (!user) return;
        const check = () => {
            api.get<any[]>('/users/schedule').then((data) => {
                const list = Array.isArray(data) ? data : [];
                setLiveCount(list.filter((s) => s.status === 'LIVE').length);
            }).catch(() => {});
            api.get<{ count: number }>('/announcements/unread-count').then((d) => {
                setUnreadAnnouncements(d?.count || 0);
            }).catch(() => {});
        };
        check();
        const t = setInterval(check, 60_000);
        return () => clearInterval(t);
    }, [user]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { setDrawerOpen(false); }, [pathname]);

    if (!_hasHydrated || !user) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    const handleLogout = async () => { await logout(); router.push('/login'); };
    const navGroups = getNavGroups(user.role);
    const badges: Record<string, number> = {};
    if (unreadAnnouncements > 0) {
        badges['/announcements'] = unreadAnnouncements;
        badges['/instructor/announcements'] = unreadAnnouncements;
    }

    return (
        <div className="min-h-screen flex bg-[#f1f5f9] overflow-x-clip">

            {/* Desktop sidebar with collapse */}
            <DesktopSidebar
                user={user}
                pathname={pathname}
                liveCount={liveCount}
                showNotif={showNotif}
                setShowNotif={setShowNotif}
                notifRef={notifRef}
                onLogout={handleLogout}
                collapsed={collapsed}
                onToggle={handleToggle}
                navGroups={navGroups}
                logoBg={branding.logoBg}
                logoBgHeight={branding.logoBgHeight}
                badges={badges}
            />

            {/* Mobile drawer */}
            <MobileSidebar
                user={user}
                pathname={pathname}
                liveCount={liveCount}
                showNotif={showNotif}
                setShowNotif={setShowNotif}
                notifRef={notifRef}
                onNavClick={() => setDrawerOpen(false)}
                onLogout={handleLogout}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                navGroups={navGroups}
                logoBg={branding.logoBg}
                logoBgHeight={branding.logoBgHeight}
            />

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

                {/* Mobile top bar */}
                <header className="lg:hidden sticky top-0 z-30 h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">
                    <button onClick={() => setDrawerOpen(true)} className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Menu className="h-4 w-4 text-gray-700" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                            <GraduationCap className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="font-bold text-sm text-gray-900">{siteConfig.name}</span>
                    </div>
                    {liveCount > 0 && (
                        <span className="ml-auto text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">{liveCount} LIVE</span>
                    )}
                </header>

                <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">{children}</main>
                <AiChat />

                {/* Mobile bottom nav */}
                <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex items-center justify-around h-14 px-2">
                    {navGroups[0].items.map((item) => {
                        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        const badge = badges[item.href] || 0;
                        return (
                            <Link key={item.href} href={item.href}
                                className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-0 relative', active ? 'text-primary' : 'text-gray-400 hover:text-gray-700')}>
                                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                                <span className="text-[10px] font-medium truncate">{item.label}</span>
                                {active && <span className="h-1 w-1 rounded-full bg-primary" />}
                                {badge > 0 && <span className="absolute top-0.5 right-1 h-2 w-2 bg-red-500 rounded-full" />}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
