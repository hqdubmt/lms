import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `auth_token=${token}; path=/; samesite=lax; max-age=900`;
}

function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = 'auth_token=; path=/; max-age=0';
}

interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
  isVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; accessToken: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      setToken: (token) => {
        api.setToken(token);
        set({ accessToken: token });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password });
          api.setToken(res.accessToken);
          set({ user: res.user, accessToken: res.accessToken });
          setAuthCookie(res.accessToken);
          return res;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        api.setToken(null);
        set({ user: null, accessToken: null });
        clearAuthCookie();
      },

      fetchMe: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const user = await api.get<User>('/auth/me');
          set({ user });
        } catch {
          set({ user: null, accessToken: null });
        }
      },
    }),
    {
      name: 'masterlms-auth',
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          api.setToken(state.accessToken);
          setAuthCookie(state.accessToken);
        }
      },
    },
  ),
);
