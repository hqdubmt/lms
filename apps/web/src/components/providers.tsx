'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketStore } from '@/stores/socket.store';

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchMe, accessToken } = useAuthStore();
  const { connect } = useSocketStore();
  // Prevent React Strict Mode double-invocation from triggering concurrent
  // fetchMe calls — which would race on rotating refresh tokens and cause
  // the second call to fail (revoked token), clearing the auth store.
  const fetchMeStarted = useRef(false);

  useEffect(() => {
    if (fetchMeStarted.current) return;
    fetchMeStarted.current = true;
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (accessToken) connect(accessToken);
  }, [accessToken, connect]);

  return <>{children}</>;
}
