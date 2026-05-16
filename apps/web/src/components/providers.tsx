'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocketStore } from '@/stores/socket.store';

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchMe, accessToken } = useAuthStore();
  const { connect } = useSocketStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (accessToken) connect(accessToken);
  }, [accessToken, connect]);

  return <>{children}</>;
}
