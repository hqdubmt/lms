'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function useRequireAuth(role?: 'INSTRUCTOR' | 'ADMIN') {
  const router = useRouter();
  const { user, accessToken, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!user && accessToken) {
      fetchMe();
      return;
    }
    if (!user && !accessToken) {
      router.replace('/login');
      return;
    }
    if (role === 'INSTRUCTOR' && user && !['INSTRUCTOR', 'ADMIN'].includes(user.role)) {
      router.replace('/language');
    }
  }, [user, accessToken, fetchMe, role, router]);

  return { user, ready: !!user };
}
