'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';

function OAuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, fetchMe } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');

    if (!token) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    setToken(token);
    api.setToken(token);

    if (typeof document !== 'undefined') {
      document.cookie = `auth_token=${token}; path=/; samesite=lax; max-age=900`;
    }

    fetchMe().then(() => {
      router.replace(role === 'ADMIN' ? '/admin' : '/dashboard');
    });
  }, []);

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <Suspense>
        <OAuthHandler />
      </Suspense>
    </div>
  );
}
