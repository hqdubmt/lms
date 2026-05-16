'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { GraduationCap, Bell, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { siteConfig } from '@/config/site';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          {siteConfig.logoUrl ? (
            <Image src={siteConfig.logoUrl} alt={siteConfig.name} width={siteConfig.logoWidth} height={siteConfig.logoHeight} className="object-contain" />
          ) : (
            <>
              <GraduationCap className="h-7 w-7" />
              <span>{siteConfig.name}</span>
            </>
          )}
        </Link>

        <div className="hidden md:flex ml-8 gap-6 text-sm font-medium">
          <Link href="/courses" className={`transition-colors hover:text-primary ${pathname === '/courses' ? 'text-primary' : 'text-muted-foreground'}`}>
            Khóa học
          </Link>
          {user && (
            <Link href="/dashboard" className={`transition-colors hover:text-primary ${pathname.startsWith('/dashboard') ? 'text-primary' : 'text-muted-foreground'}`}>
              Học của tôi
            </Link>
          )}
          {user && (
            <Link href="/schedule" className={`transition-colors hover:text-primary ${pathname.startsWith('/schedule') ? 'text-primary' : 'text-muted-foreground'}`}>
              Lịch học
            </Link>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.[0]?.toUpperCase() || 'U'.toUpperCase()}
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Đăng xuất
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Đăng nhập</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Đăng ký</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
