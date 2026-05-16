'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  LogOut, ChevronRight, School,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

const navItems = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Khóa học', icon: BookOpen },
  { href: '/admin/classes', label: 'Lớp học', icon: School },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, fetchMe, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user && accessToken) {
      fetchMe();
    } else if (!user && !accessToken) {
      router.replace('/login');
    } else if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, accessToken, fetchMe, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Sidebar */}
      <aside
        className="w-64 border-r flex flex-col shrink-0"
        style={siteConfig.adminSidebarBackground
          ? { background: siteConfig.adminSidebarBackground }
          : undefined}
      >
        <div className={cn(
          'h-16 flex items-center gap-2 px-6 border-b',
          siteConfig.adminSidebarBackground ? 'border-white/10' : '',
        )}>
          {siteConfig.logoUrl ? (
            <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain" />
          ) : (
            <>
              <GraduationCap className={cn('h-6 w-6', siteConfig.adminSidebarBackground ? 'text-white' : 'text-primary')} />
              <span className={cn('font-bold text-lg', siteConfig.adminSidebarBackground ? 'text-white' : '')}>{siteConfig.name}</span>
            </>
          )}
          <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded ml-auto">Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const hasBg = !!siteConfig.adminSidebarBackground;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : hasBg
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className={cn('p-3 border-t space-y-1', siteConfig.adminSidebarBackground ? 'border-white/10' : '')}>
          <div className={cn('px-3 py-2 text-xs truncate', siteConfig.adminSidebarBackground ? 'text-white/50' : 'text-muted-foreground')}>{user.email}</div>
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              siteConfig.adminSidebarBackground
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
