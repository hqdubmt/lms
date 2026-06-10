'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  LogOut, ChevronRight, School, Menu, X, ChevronLeft, Globe, Calculator, BookType,
  Image as ImageIcon, Palette, HardDrive, FileType2, Bot, Library, ChevronDown, BarChart2, Bell,
  Building2, Settings,
} from 'lucide-react';
import { useAuthStore, useHydrated } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { useBranding } from '@/hooks/useBranding';

type NavItem = { href: string; label: string; icon: any; exact?: boolean };
type NavGroup = { type: 'group'; label: string; icon: any; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).type === 'group';
}

const navItems: NavEntry[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  {
    type: 'group', label: 'Tài liệu', icon: Library,
    items: [
      { href: '/admin/documents', label: 'Documents',  icon: Library },
      { href: '/admin/copilot',   label: 'Copilot',    icon: Bot },
      { href: '/admin/convert',   label: 'Convert MD', icon: FileType2 },
    ],
  },
  { href: '/admin/ai-analytics', label: 'AI Analytics', icon: BarChart2 },
  {
    type: 'group', label: 'Nội dung', icon: BookOpen,
    items: [
      { href: '/admin/courses',  label: 'Khóa học',   icon: BookOpen },
      { href: '/admin/media',    label: 'Thư viện',   icon: ImageIcon },
      { href: '/admin/language', label: 'Ngoại ngữ',  icon: Globe },
      { href: '/admin/math',     label: 'Toán học',   icon: Calculator },
      { href: '/admin/viet',     label: 'Tiếng Việt', icon: BookType },
    ],
  },
  {
    type: 'group', label: 'Hệ thống', icon: Settings,
    items: [
      { href: '/admin/users',    label: 'Người dùng',  icon: Users },
      { href: '/admin/classes',  label: 'Lớp học',     icon: School },
      { href: '/admin/branding', label: 'Thương hiệu', icon: Palette },
      { href: '/admin/backup',   label: 'Backup',      icon: HardDrive },
    ],
  },
  { href: '/admin/enterprise',         label: 'Marketplace', icon: Building2 },
  { href: '/instructor/announcements', label: 'Thông báo',   icon: Bell },
];

const COLLAPSED_KEY = 'admin_sidebar_collapsed';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

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
  user, pathname, collapsed, onToggle, onLogout, logoBg, logoBgHeight,
}: {
  user: any; pathname: string; collapsed: boolean; onToggle: () => void; onLogout: () => void;
  logoBg: string; logoBgHeight: number;
}) {
  const hasBg = !!siteConfig.adminSidebarBackground;
  const bgStyle = siteConfig.adminSidebarBackground
    ? { background: siteConfig.adminSidebarBackground }
    : undefined;
  const hasLogoBg = !!logoBg;
  const logoBgStyle: React.CSSProperties = logoBg
    ? { background: logoBg, ...(logoBgHeight ? { height: logoBgHeight } : {}) }
    : {};

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>();
    navItems.forEach(entry => {
      if (isGroup(entry) && entry.items.some(item => pathname.startsWith(item.href))) {
        open.add(entry.label);
      }
    });
    return open;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r transition-all duration-300 relative',
        collapsed ? 'w-[60px]' : 'w-64',
        hasBg ? 'border-white/10' : 'border-border',
      )}
      style={bgStyle}
    >
      {/* ── Toggle tab — sticks out on the right edge ── */}
      <button
        onClick={onToggle}
        title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -right-5 z-10',
          'w-5 h-10 rounded-r-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          hasBg
            ? 'bg-[#1e293b] hover:bg-[#334155] border border-l-0 border-white/10 text-white/50 hover:text-white'
            : 'bg-white hover:bg-gray-50 border border-l-0 border-border text-muted-foreground hover:text-foreground shadow-sm',
        )}
      >
        <ChevronLeft className={cn('h-3 w-3 transition-transform duration-300', collapsed && 'rotate-180')} />
      </button>

      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b shrink-0 overflow-hidden px-3',
          !siteConfig.logoBgHeight && 'h-16',
          hasBg || hasLogoBg ? 'border-white/10' : 'border-border',
        )}
        style={logoBgStyle}
      >
        {collapsed ? (
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mx-auto', hasBg || hasLogoBg ? 'bg-white/10' : 'bg-primary/10')}>
            <GraduationCap className={cn('h-4 w-4', hasBg || hasLogoBg ? 'text-white' : 'text-primary')} />
          </div>
        ) : siteConfig.logoUrl ? (
          <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain mx-auto" />
        ) : hasLogoBg ? null : (
          <div className="flex items-center gap-2 overflow-hidden w-full">
            <GraduationCap className={cn('h-6 w-6 shrink-0', hasBg ? 'text-white' : 'text-primary')} />
            <span className={cn('font-bold text-base truncate', hasBg ? 'text-white' : '')}>{siteConfig.name}</span>
            <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded ml-auto shrink-0">Admin</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((entry) => {
          if (isGroup(entry)) {
            const group = entry;
            const groupActive = group.items.some(item => pathname.startsWith(item.href));

            if (collapsed) {
              return (
                <Fragment key={group.label}>
                  {group.items.map(item => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Tooltip key={item.href} label={item.label}>
                        <Link href={item.href}
                          className={cn(
                            'flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : hasBg
                                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </Tooltip>
                    );
                  })}
                </Fragment>
              );
            }

            const groupOpen = openGroups.has(group.label) || groupActive;
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                    groupActive
                      ? hasBg ? 'text-white' : 'text-foreground'
                      : hasBg ? 'text-white/40' : 'text-muted-foreground/70',
                    hasBg ? 'hover:bg-white/5 hover:text-white/70' : 'hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <group.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', groupOpen && 'rotate-180')} />
                </button>
                {groupOpen && (
                  <div className="pl-3 mt-0.5 space-y-0.5">
                    {group.items.map(item => {
                      const active = pathname.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
                  </div>
                )}
              </div>
            );
          }

          const item = entry;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const linkEl = (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2.5 w-full',
                active
                  ? 'bg-primary text-primary-foreground'
                  : hasBg
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  {item.label}
                  {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                </>
              )}
            </Link>
          );

          return collapsed
            ? <Tooltip key={item.href} label={item.label}>{linkEl}</Tooltip>
            : <div key={item.href}>{linkEl}</div>;
        })}
      </nav>

      {/* Footer */}
      <div className={cn('p-2 border-t space-y-1 shrink-0', hasBg ? 'border-white/10' : 'border-border')}>
        {!collapsed && (
          <div className={cn('px-3 py-2 text-xs truncate', hasBg ? 'text-white/50' : 'text-muted-foreground')}>{user.email}</div>
        )}
        {collapsed ? (
          <Tooltip label="Đăng xuất">
            <button
              onClick={onLogout}
              className={cn(
                'w-10 h-10 mx-auto flex items-center justify-center rounded-lg transition-colors',
                hasBg ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
              )}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={onLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              hasBg ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        )}
      </div>
    </aside>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, fetchMe, logout } = useAuthStore();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpenGroups, setMobileOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>();
    navItems.forEach(entry => {
      if (isGroup(entry) && entry.items.some(item => pathname.startsWith(item.href))) {
        open.add(entry.label);
      }
    });
    return open;
  });
  const branding = useBranding();

  const toggleMobileGroup = (label: string) => {
    setMobileOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

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
    else if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, accessToken, hydrated, fetchMe, router]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  if (!hydrated || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => { await logout(); router.push('/login'); };

  const hasBg = !!siteConfig.adminSidebarBackground;
  const drawerStyle = siteConfig.adminSidebarBackground
    ? { background: siteConfig.adminSidebarBackground }
    : { background: '#fff', borderRight: '1px solid #e2e8f0' };
  const hasLogoBg = !!branding.logoBg;
  const logoBgStyle: React.CSSProperties = branding.logoBg
    ? { background: branding.logoBg, ...(branding.logoBgHeight ? { height: branding.logoBgHeight } : {}) }
    : {};

  return (
    <div className="min-h-screen flex bg-muted/20 overflow-x-clip">

      {/* Desktop collapsible sidebar */}
      <DesktopSidebar
        user={user}
        pathname={pathname}
        collapsed={collapsed}
        onToggle={handleToggle}
        onLogout={handleLogout}
        logoBg={branding.logoBg}
        logoBgHeight={branding.logoBgHeight}
      />

      {/* Mobile overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 lg:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={drawerStyle}
      >
        <button onClick={() => setDrawerOpen(false)} className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-black/10 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div
          className={cn(
            'flex items-center gap-2 px-6 border-b shrink-0 overflow-hidden',
            !branding.logoBgHeight && 'h-16',
            hasBg || hasLogoBg ? 'border-white/10' : 'border-border',
          )}
          style={logoBgStyle}
        >
          {siteConfig.logoUrl ? (
            <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain mx-auto" />
          ) : hasLogoBg ? null : (
            <>
              <GraduationCap className={cn('h-6 w-6 shrink-0', hasBg ? 'text-white' : 'text-primary')} />
              <span className={cn('font-bold text-lg truncate', hasBg ? 'text-white' : '')}>{siteConfig.name}</span>
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded ml-auto shrink-0">Admin</span>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((entry) => {
            if (isGroup(entry)) {
              const group = entry;
              const groupActive = group.items.some(item => pathname.startsWith(item.href));
              const groupOpen = mobileOpenGroups.has(group.label) || groupActive;
              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleMobileGroup(group.label)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                      groupActive
                        ? hasBg ? 'text-white' : 'text-foreground'
                        : hasBg ? 'text-white/40' : 'text-muted-foreground/70',
                      hasBg ? 'hover:bg-white/5 hover:text-white/70' : 'hover:bg-accent/50 hover:text-foreground',
                    )}
                  >
                    <group.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', groupOpen && 'rotate-180')} />
                  </button>
                  {groupOpen && (
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      {group.items.map(item => {
                        const active = pathname.startsWith(item.href);
                        return (
                          <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                              active ? 'bg-primary text-primary-foreground'
                                : hasBg ? 'text-white/70 hover:bg-white/10 hover:text-white'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            )}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                            {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const item = entry;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground'
                    : hasBg ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn('p-3 border-t space-y-1 shrink-0', hasBg ? 'border-white/10' : 'border-border')}>
          <div className={cn('px-3 py-2 text-xs truncate', hasBg ? 'text-white/50' : 'text-muted-foreground')}>{user.email}</div>
          <button onClick={handleLogout}
            className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              hasBg ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive')}>
            <LogOut className="h-4 w-4" />Đăng xuất
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-12 bg-white border-b flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
            <Menu className="h-4 w-4 text-gray-700" />
          </button>
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm">{siteConfig.name}</span>
          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded ml-auto">Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-16 lg:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t flex items-center justify-around h-14 px-1">
          {navItems.map((entry) => {
            if (isGroup(entry)) {
              const group = entry;
              const groupActive = group.items.some(item => pathname.startsWith(item.href));
              const activeItem = group.items.find(item => pathname.startsWith(item.href));
              const href = activeItem?.href ?? group.items[0]?.href ?? '#';
              return (
                <Link key={group.label} href={href}
                  className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-0', groupActive ? 'text-primary' : 'text-gray-400')}>
                  <group.icon className={cn('h-5 w-5', groupActive && 'stroke-[2.5px]')} />
                  <span className="text-[10px] font-medium truncate">{group.label}</span>
                  {groupActive && <span className="h-1 w-1 rounded-full bg-primary" />}
                </Link>
              );
            }
            const item = entry;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-0', active ? 'text-primary' : 'text-gray-400')}>
                <item.icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
                {active && <span className="h-1 w-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
