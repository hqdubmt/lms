import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    // Use current origin so WebSocket goes through the Next.js proxy (avoids
    // Mixed Content when accessing via HTTPS domains like Tailscale).
    const origin = typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');

    const socket = io(origin, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false }));

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },
}));
