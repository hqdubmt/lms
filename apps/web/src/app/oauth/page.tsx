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
    const code = searchParams.get('code');

    if (!code) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    api.post<{ accessToken: string; role: string }>('/auth/oauth/exchange', { code })
      .then(({ accessToken, role }) => {
        setToken(accessToken);
        api.setToken(accessToken);

        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${accessToken}; path=/; samesite=lax; max-age=900`;
        }

        return fetchMe().then(() => {
          router.replace(role === 'ADMIN' ? '/admin' : '/dashboard');
        });
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
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
