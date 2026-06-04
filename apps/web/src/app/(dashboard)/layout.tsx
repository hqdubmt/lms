'use client';

import { useCallback, useEffect, useRef, useState, type ElementType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, BookOpen, MonitorPlay, Settings, GraduationCap, LogOut, ChevronRight,
    Bell, Video, BookMarked, X, Menu, ChevronLeft, Globe, Calculator, BookType,
    Image as ImageIcon, Gamepad2, Brain, Bot, FileType2, ClipboardList, CheckCircle2, SendHorizonal, UserCheck,
    Calendar, RotateCcw, Award, Target, Zap, Megaphone, Users,
} from 'lucide-react';
import { useAuthStore, useHydrated } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { api } from '@/lib/api';
import { useBranding } from '@/hooks/useBranding';
import { AiChat } from '@/components/ai/AiChat';

interface Notif {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead?: boolean;
    readAt?: string | null;
    createdAt: string;
    link?: string;
    data?: { todoId?: string } | null;
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
            { href: '/schedule',       label: 'Phòng học',  icon: MonitorPlay },
            { href: '/todo',           label: 'Công việc',  icon: ClipboardList },
        ],
    },
    {
        label: 'AI',
        collapsible: true,
        groupIcon: Zap,
        items: [
            { href: '/learning',                   label: 'Tiến độ AI',    icon: Brain,     exact: true },
            { href: '/learning/coach',             label: 'Study Coach',   icon: Target },
            { href: '/learning/revision',          label: 'Ôn tập',        icon: RotateCcw },
            { href: '/learning/timeline',          label: 'Timeline',      icon: Calendar },
            { href: '/learning/report-card',       label: 'Bảng điểm AI',  icon: Award },
            { href: '/learning/knowledge-graph',   label: 'Knowledge Map', icon: Brain },
        ],
    },
];

const INSTRUCTOR_HREF_MAP: Record<string, string> = {
    '/language':     '/instructor/language',
    '/math':         '/instructor/math',
    '/viet':         '/instructor/viet',
    '/media':        '/instructor/media',
    '/quiz':         '/instructor/quiz',
};

const INSTRUCTOR_EXTRA_GROUP = {
    label: 'SOẠN BÀI',
    collapsible: true,
    groupIcon: Bot,
    items: [
        { href: '/instructor/copilot',        label: 'Copilot AI',   icon: Bot,      exact: false as const },
        { href: '/instructor/convert',        label: 'Convert MD',   icon: FileType2, exact: false as const },
        { href: '/instructor/announcements',  label: 'Thông báo',    icon: Bell,      exact: false as const },
    ],
};

function getNavGroups(role?: string) {
    if (role === 'INSTRUCTOR' || role === 'ADMIN') {
        const remapped = BASE_NAV_GROUPS.map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                href: INSTRUCTOR_HREF_MAP[item.href] ?? item.href,
            })),
        }));
        return [...remapped, INSTRUCTOR_EXTRA_GROUP];
    }
    return BASE_NAV_GROUPS;
}

interface Announcement {
    id: string; title: string; content: string;
    topic: 'SYSTEM' | 'COURSE' | 'CLASS' | 'EVENT' | 'GENERAL';
    isPinned: boolean; isRead: boolean; createdAt: string;
}

function NotifIcon(type: string) {
    if (type === 'ANN_SYSTEM') return Megaphone;
    if (type === 'ANN_COURSE') return BookOpen;
    if (type === 'ANN_CLASS') return Users;
    if (type === 'ANN_EVENT') return Calendar;
    if (type === 'ANN_GENERAL') return Globe;
    if (type === 'SESSION_LIVE' || type === 'SESSION_UPCOMING') return Video;
    if (type === 'ENROLLMENT') return GraduationCap;
    if (type === 'TODO_ASSIGNED') return SendHorizonal;
    if (type === 'TODO_ACCEPTED') return UserCheck;
    if (type === 'TODO_RESULT_READY') return SendHorizonal;
    if (type === 'TODO_CONFIRMED') return CheckCircle2;
    if (type === 'TODO_COMPLETED') return CheckCircle2;
    return BookMarked;
}

function notifColor(type: string) {
    if (type === 'ANN_SYSTEM') return { bg: 'bg-red-100', icon: 'text-red-600', text: 'text-red-700' };
    if (type === 'ANN_COURSE') return { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-700' };
    if (type === 'ANN_CLASS') return { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-700' };
    if (type === 'ANN_EVENT') return { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' };
    if (type === 'ANN_GENERAL') return { bg: 'bg-gray-100', icon: 'text-gray-600', text: 'text-gray-700' };
    if (type === 'SESSION_LIVE') return { bg: 'bg-red-100', icon: 'text-red-500', text: 'text-red-600' };
    if (type === 'TODO_ASSIGNED') return { bg: 'bg-yellow-100', icon: 'text-yellow-600', text: 'text-yellow-700' };
    if (type === 'TODO_ACCEPTED') return { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-700' };
    if (type === 'TODO_RESULT_READY') return { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-700' };
    if (type === 'TODO_CONFIRMED') return { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' };
    if (type === 'TODO_COMPLETED') return { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' };
    return { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-600' };
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

function NotificationDropdown({ onClose, collapsed, onUnreadChange }: {
    onClose: () => void; collapsed: boolean; onUnreadChange?: (n: number) => void;
}) {
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [dbRes, sessions, annItems] = await Promise.all([
                api.get<{ items: Notif[]; unread: number }>('/notifications'),
                api.get<any[]>('/users/schedule').catch(() => [] as any[]),
                api.get<Announcement[]>('/announcements').catch(() => [] as Announcement[]),
            ]);

            const sessionNotifs: Notif[] = (Array.isArray(sessions) ? sessions : [])
                .filter((s) => s.status !== 'ENDED')
                .slice(0, 4)
                .map((s) => ({
                    id: `session-${s.id}`,
                    type: s.status === 'LIVE' ? 'SESSION_LIVE' : 'SESSION_UPCOMING',
                    title: s.status === 'LIVE' ? 'Đang diễn ra' : 'Buổi học sắp tới',
                    body: s.title + (s.class?.name ? ` · ${s.class.name}` : s.course?.title ? ` · ${s.course.title}` : ''),
                    createdAt: s.startTime,
                    isRead: true,
                    link: '/schedule',
                }));

            const annNotifs: Notif[] = (Array.isArray(annItems) ? annItems : []).map((a) => ({
                id: `ann-${a.id}`,
                type: `ANN_${a.topic}`,
                title: a.title,
                body: a.content,
                createdAt: a.createdAt,
                isRead: a.isRead,
                link: '/announcements',
            }));

            const merged = [...sessionNotifs, ...annNotifs, ...(dbRes.items ?? [])]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 30);

            setNotifs(merged);
            const annUnread = annNotifs.filter((a) => !a.isRead).length;
            const total = (dbRes.unread ?? 0) + annUnread;
            setUnread(total);
            onUnreadChange?.(total);
        } catch {
            setNotifs([]);
        } finally {
            setLoading(false);
        }
    }, [onUnreadChange]);

    useEffect(() => { load(); }, [load]);

    const markAllRead = async () => {
        await Promise.all([
            api.patch('/notifications/read-all', {}).catch(() => {}),
            api.post('/announcements/read-all', {}).catch(() => {}),
        ]);
        setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
        onUnreadChange?.(0);
    };

    return (
        <div className={cn(
            'absolute bottom-0 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col',
            'left-full ml-2 sm:left-full sm:ml-2',
            'max-sm:fixed max-sm:inset-x-3 max-sm:bottom-16 max-sm:left-3 max-sm:w-auto',
            'max-h-[min(480px,80vh)]',
        )}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-indigo-600" />
                    <span className="font-semibold text-sm">Thông báo</span>
                    {unread > 0 && (
                        <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unread}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unread > 0 && (
                        <button onClick={markAllRead} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold">
                            Đọc tất cả
                        </button>
                    )}
                    <button onClick={onClose} className="h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                        <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
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
                    const c = notifColor(n.type);
                    const href = n.link ?? (n.data?.todoId ? '/todo' : n.type.startsWith('SESSION') ? '/schedule' : '/todo');
                    const isUnread = n.isRead === false;
                    const isAnn = n.id.startsWith('ann-');
                    const isSystem = n.type === 'ANN_SYSTEM';
                    return (
                        <Link
                            key={n.id}
                            href={href}
                            onClick={async () => {
                                if (isUnread) {
                                    if (isAnn) {
                                        await api.post(`/announcements/${n.id.replace('ann-', '')}/read`, {}).catch(() => {});
                                    } else if (!n.id.startsWith('session-')) {
                                        await api.patch(`/notifications/${n.id}/read`, {}).catch(() => {});
                                    }
                                }
                                onClose();
                            }}
                            className={cn(
                                'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors',
                                isUnread && (isSystem ? 'bg-red-50/60' : 'bg-indigo-50/50'),
                            )}
                        >
                            <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', c.bg)}>
                                <Icon className={cn('h-4 w-4', c.icon)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn('text-xs font-semibold', c.text)}>{n.title}</p>
                                <p className="text-xs text-gray-700 mt-0.5 line-clamp-2">{n.body}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{fmtRelative(n.createdAt)}</p>
                            </div>
                            {isUnread && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-2 animate-pulse" />}
                        </Link>
                    );
                })}
            </div>
            <Link
                href="/announcements"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border-t border-gray-100 hover:bg-indigo-50/50 transition-colors shrink-0"
            >
                Xem tất cả thông báo
                <ChevronRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

// ─── Collapsible Nav Group ────────────────────────────────────────────────────

type NavItem = { href: string; label: string; icon: ElementType; exact?: boolean };
type NavGroup = { label: string; items: NavItem[]; collapsible?: boolean; groupIcon?: ElementType };

function CollapsibleNavGroup({ group, pathname, sidebarCollapsed, onNavClick }: {
    group: NavGroup; pathname: string; sidebarCollapsed?: boolean; onNavClick?: () => void;
}) {
    const isAnyActive = group.items.some(item =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href)
    );
    const [open, setOpen] = useState(isAnyActive);

    useEffect(() => { if (isAnyActive) setOpen(true); }, [isAnyActive]); // eslint-disable-line react-hooks/exhaustive-deps

    const GroupIcon = group.groupIcon ?? Zap;

    if (sidebarCollapsed) {
        return (
            <div className="space-y-0.5">
                {group.items.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    const linkEl = (
                        <Link href={item.href} className={cn(
                            'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all',
                            active ? 'bg-primary text-white shadow-sm' : 'text-white/55 hover:bg-white/8 hover:text-white',
                        )}>
                            <item.icon className="h-4 w-4" />
                        </Link>
                    );
                    return <Tooltip key={item.href} label={item.label}>{linkEl}</Tooltip>;
                })}
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isAnyActive ? 'text-white' : 'text-white/55 hover:bg-white/8 hover:text-white',
                    open && 'bg-white/5',
                )}
            >
                <GroupIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{group.label}</span>
                <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-90')} />
            </button>
            {open && (
                <div className="ml-3 pl-2.5 border-l border-white/10 mt-0.5 space-y-0.5">
                    {group.items.map((item) => {
                        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} onClick={onNavClick}
                                className={cn(
                                    'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    active ? 'bg-primary text-white shadow-sm' : 'text-white/50 hover:bg-white/8 hover:text-white',
                                )}>
                                <item.icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                                {active && <ChevronRight className="h-3 w-3 ml-auto shrink-0 opacity-70" />}
                            </Link>
                        );
                    })}
                </div>
            )}
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
    user, pathname, liveCount, unreadNotifs, showNotif, setShowNotif,
    notifRef, onLogout, collapsed, onToggle, navGroups, logoBg, logoBgHeight, onUnreadChange,
}: {
    user: any; pathname: string; liveCount: number; unreadNotifs: number;
    showNotif: boolean; setShowNotif: (v: boolean) => void;
    notifRef: React.RefObject<HTMLDivElement>;
    onLogout: () => void; collapsed: boolean; onToggle: () => void;
    navGroups: ReturnType<typeof getNavGroups>;
    logoBg: string; logoBgHeight: number;
    onUnreadChange: (n: number) => void;
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
                        {(group as NavGroup).collapsible ? (
                            <CollapsibleNavGroup
                                group={group as NavGroup}
                                pathname={pathname}
                                sidebarCollapsed={collapsed}
                            />
                        ) : (
                            <>
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
                                                <item.icon className="h-4 w-4 shrink-0" />
                                                {!collapsed && (
                                                    <>
                                                        <span className="truncate">{item.label}</span>
                                                        {active ? (
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
                            </>
                        )}
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
                                {(liveCount + unreadNotifs) > 0 && (
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
                                {(liveCount + unreadNotifs) > 0 && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-[7px] text-white font-bold leading-none">{liveCount + unreadNotifs}</span>
                                    </span>
                                )}
                            </div>
                            <span className="truncate">Thông báo</span>
                            {(liveCount + unreadNotifs) > 0 && (
                                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                    {liveCount > 0 ? `${liveCount} LIVE` : unreadNotifs}
                                </span>
                            )}
                        </button>
                    )}
                    {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} collapsed={collapsed} onUnreadChange={onUnreadChange} />}
                </div>

                {/* Settings */}
                {collapsed ? (
                    <Tooltip label="Cài đặt">
                        <Link href="/settings"
                            className={cn('w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors',
                                pathname === '/settings' ? 'bg-primary text-white' : 'text-white/40 hover:bg-white/8 hover:text-white/80')}>
                            <Settings className="h-3.5 w-3.5" />
                        </Link>
                    </Tooltip>
                ) : (
                    <Link href="/settings"
                        className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            pathname === '/settings' ? 'bg-primary text-white' : 'text-white/40 hover:bg-white/8 hover:text-white/80')}>
                        <Settings className="h-3.5 w-3.5" />Cài đặt
                    </Link>
                )}

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
    user, pathname, liveCount, unreadNotifs, showNotif, setShowNotif,
    notifRef, onNavClick, onLogout, open, onClose, navGroups, logoBg, logoBgHeight, onUnreadChange,
}: {
    user: any; pathname: string; liveCount: number; unreadNotifs: number;
    showNotif: boolean; setShowNotif: (v: boolean) => void;
    notifRef: React.RefObject<HTMLDivElement>;
    onNavClick: () => void; onLogout: () => void;
    open: boolean; onClose: () => void;
    navGroups: ReturnType<typeof getNavGroups>;
    logoBg: string; logoBgHeight: number;
    onUnreadChange: (n: number) => void;
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
                            {(group as NavGroup).collapsible ? (
                                <CollapsibleNavGroup
                                    group={group as NavGroup}
                                    pathname={pathname}
                                    sidebarCollapsed={false}
                                    onNavClick={onNavClick}
                                />
                            ) : (
                                <>
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
                                </>
                            )}
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
                            {(liveCount + unreadNotifs) > 0 && (
                                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                    {liveCount > 0 ? `${liveCount} LIVE` : unreadNotifs}
                                </span>
                            )}
                        </button>
                        {showNotif && <NotificationDropdown onClose={() => setShowNotif(false)} collapsed={false} onUnreadChange={onUnreadChange} />}
                    </div>
                    <Link href="/settings" onClick={onNavClick}
                        className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                            pathname === '/settings' ? 'bg-primary text-white' : 'text-white/40 hover:bg-white/8 hover:text-white/80')}>
                        <Settings className="h-3.5 w-3.5" />Cài đặt
                    </Link>
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

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function MobileBottomNav({ pathname, unreadNotifs, liveCount, onUnreadChange, role }: {
    pathname: string; unreadNotifs: number; liveCount: number; onUnreadChange: (n: number) => void; role?: string;
}) {
    const [showSubjects, setShowSubjects] = useState(false);
    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const subjectRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setShowSubjects(false); setShowNotif(false); }, [pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
            if (subjectRef.current && !subjectRef.current.contains(e.target as Node)) setShowSubjects(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const totalBadge = liveCount + unreadNotifs;
    const isInstructor = role === 'INSTRUCTOR' || role === 'ADMIN';

    const subjectItems = isInstructor ? [
        { href: '/instructor/language', label: 'Ngoại Ngữ', icon: Globe,       color: 'bg-purple-50 text-purple-600' },
        { href: '/instructor/math',     label: 'Toán học',   icon: Calculator,  color: 'bg-blue-50 text-blue-600' },
        { href: '/instructor/viet',     label: 'Tiếng Việt', icon: BookType,    color: 'bg-green-50 text-green-600' },
    ] : [
        { href: '/language', label: 'Ngoại Ngữ', icon: Globe,       color: 'bg-purple-50 text-purple-600' },
        { href: '/math',     label: 'Toán học',   icon: Calculator,  color: 'bg-blue-50 text-blue-600' },
        { href: '/viet',     label: 'Tiếng Việt', icon: BookType,    color: 'bg-green-50 text-green-600' },
    ];

    const mainItems = [
        { href: '/dashboard',                    label: 'Trang chủ', icon: Home,          exact: true  },
        { href: isInstructor ? '/instructor/quiz' : '/quiz', label: 'Quiz Game',  icon: Gamepad2,      exact: false },
        { href: '/todo',                          label: 'Công việc', icon: ClipboardList, exact: false },
    ];

    const subjectBasePaths = isInstructor
        ? ['/instructor/language', '/instructor/math', '/instructor/viet']
        : ['/language', '/math', '/viet'];
    const isSubjectActive = subjectBasePaths.some((p) => pathname.startsWith(p));

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex items-center justify-around h-14 px-1">
            {/* Trang chủ */}
            {mainItems.slice(0, 1).map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                    <Link key={item.href} href={item.href}
                        className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-0', active ? 'text-primary' : 'text-gray-400')}>
                        <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                        <span className="text-[10px] font-medium truncate">{item.label}</span>
                        {active && <span className="h-1 w-1 rounded-full bg-primary" />}
                    </Link>
                );
            })}

            {/* Môn học popup */}
            <div ref={subjectRef} className="relative flex flex-col items-center">
                <button
                    onClick={() => { setShowSubjects((v) => !v); setShowNotif(false); }}
                    className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors', isSubjectActive || showSubjects ? 'text-primary' : 'text-gray-400')}
                >
                    <BookOpen className={cn('h-5 w-5', (isSubjectActive || showSubjects) && 'stroke-[2.5px]')} />
                    <span className="text-[10px] font-medium">Môn học</span>
                    {isSubjectActive && <span className="h-1 w-1 rounded-full bg-primary" />}
                </button>
                {showSubjects && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex gap-2 z-10">
                        {subjectItems.map((s) => {
                            const active = pathname.startsWith(s.href);
                            return (
                                <Link key={s.href} href={s.href}
                                    className={cn('flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all', active ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-600')}>
                                    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', active ? 'bg-primary text-white' : s.color)}>
                                        <s.icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-medium whitespace-nowrap">{s.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quiz Game, Công việc */}
            {mainItems.slice(1).map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                    <Link key={item.href} href={item.href}
                        className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-0', active ? 'text-primary' : 'text-gray-400')}>
                        <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                        <span className="text-[10px] font-medium truncate">{item.label}</span>
                        {active && <span className="h-1 w-1 rounded-full bg-primary" />}
                    </Link>
                );
            })}

            {/* Thông báo (Bell) */}
            <div ref={notifRef} className="relative flex flex-col items-center">
                <button
                    onClick={() => { setShowNotif((v) => !v); setShowSubjects(false); }}
                    className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors relative', showNotif ? 'text-primary' : 'text-gray-400')}
                >
                    <div className="relative">
                        <Bell className={cn('h-5 w-5', showNotif && 'stroke-[2.5px]')} />
                        {totalBadge > 0 && (
                            <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 text-[8px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center leading-none">
                                {totalBadge > 9 ? '9+' : totalBadge}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-medium">Thông báo</span>
                </button>
                {showNotif && (
                    <NotificationDropdown
                        onClose={() => setShowNotif(false)}
                        collapsed={false}
                        onUnreadChange={onUnreadChange}
                    />
                )}
            </div>
        </nav>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, accessToken, fetchMe, logout } = useAuthStore();
    const hydrated = useHydrated();
    const pathname = usePathname();
    const router = useRouter();
    const [showNotif, setShowNotif] = useState(false);
    const [liveCount, setLiveCount] = useState(0);
    const [unreadNotifs, setUnreadNotifs] = useState(0);
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
        if (!hydrated) return;
        if (!user && accessToken) fetchMe();
        else if (!user && !accessToken) router.replace('/login');
    }, [user, accessToken, hydrated, fetchMe, router]);

    useEffect(() => {
        if (!user) return;
        const check = () => {
            api.get<any[]>('/users/schedule').then((data) => {
                const list = Array.isArray(data) ? data : [];
                setLiveCount(list.filter((s) => s.status === 'LIVE').length);
            }).catch(() => {});
            Promise.all([
                api.get<{ items: any[]; unread: number }>('/notifications').catch(() => ({ unread: 0 })),
                api.get<{ count: number }>('/announcements/unread-count').catch(() => ({ count: 0 })),
            ]).then(([notifsRes, annRes]) => {
                setUnreadNotifs((notifsRes?.unread || 0) + (annRes?.count || 0));
            });
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

    if (!hydrated || !user) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );

    const handleLogout = async () => { await logout(); router.push('/login'); };
    const navGroups = getNavGroups(user.role);

    return (
        <div className="min-h-screen flex bg-[#f1f5f9] overflow-x-clip">

            {/* Desktop sidebar with collapse */}
            <DesktopSidebar
                user={user}
                pathname={pathname}
                liveCount={liveCount}
                unreadNotifs={unreadNotifs}
                showNotif={showNotif}
                setShowNotif={setShowNotif}
                notifRef={notifRef}
                onLogout={handleLogout}
                collapsed={collapsed}
                onToggle={handleToggle}
                navGroups={navGroups}
                logoBg={branding.logoBg}
                logoBgHeight={branding.logoBgHeight}
                onUnreadChange={setUnreadNotifs}
            />

            {/* Mobile drawer */}
            <MobileSidebar
                user={user}
                pathname={pathname}
                liveCount={liveCount}
                unreadNotifs={unreadNotifs}
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
                onUnreadChange={setUnreadNotifs}
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
                <MobileBottomNav
                    pathname={pathname}
                    unreadNotifs={unreadNotifs}
                    liveCount={liveCount}
                    onUnreadChange={setUnreadNotifs}
                    role={user.role}
                />
            </div>
        </div>
    );
}
