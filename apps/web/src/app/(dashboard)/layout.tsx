'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, BookOpen, Calendar, Settings, GraduationCap, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

const navGroups = [
    {
        label: 'HỌC TẬP',
        items: [
            { href: '/dashboard', label: 'Trang chủ', icon: Home, exact: true },
            { href: '/courses', label: 'Khoá học', icon: BookOpen },
            { href: '/schedule', label: 'Lịch học', icon: Calendar },
        ],
    },
    {
        label: 'CÁ NHÂN',
        items: [
            { href: '/settings', label: 'Cài đặt', icon: Settings },
        ],
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, accessToken, fetchMe, logout } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!user && accessToken) fetchMe();
        else if (!user && !accessToken) router.replace('/login');
    }, [user, accessToken, fetchMe, router]);

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

                {/* User info */}
                <div className="p-3 border-t border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-white">{user?.name?.[0]?.toUpperCase() || 'U'?.toUpperCase()}</span>
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
