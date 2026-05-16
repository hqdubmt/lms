import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../services/redis';
import { Message } from '../services/mongo';
import type { FastifyInstance } from 'fastify';

export function setupSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
    transports: ['websocket', 'polling'],
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      // Verify JWT – reuse app jwt
      const payload = (app as any).jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as { sub: string; role: string };
    console.log(`Socket connected: ${user.sub}`);

    // Set online status
    redis.sadd('online_users', user.sub);
    io.emit('user:online', user.sub);

    // Join personal room
    socket.join(`user:${user.sub}`);

    // Chat
    socket.on('chat:join', (roomId: string) => {
      socket.join(`chat:${roomId}`);
    });

    socket.on('chat:message', async (data: { roomId: string; content: string; type?: string }) => {
      const msg = await Message.create({
        roomId: data.roomId,
        userId: user.sub,
        userName: user.sub, // ideally fetch name
        content: data.content,
        type: data.type || 'text',
      });
      io.to(`chat:${data.roomId}`).emit('chat:message', msg);
    });

    // Live classroom
    socket.on('classroom:join', (courseId: string) => {
      socket.join(`classroom:${courseId}`);
    });

    socket.on('classroom:signal', (data: any) => {
      socket.to(`classroom:${data.roomId}`).emit('classroom:signal', { ...data, from: user.sub });
    });

    // Todo sync
    socket.on('todo:updated', (todo: any) => {
      socket.to(`user:${user.sub}`).emit('todo:updated', todo);
    });

    socket.on('disconnect', () => {
      redis.srem('online_users', user.sub);
      io.emit('user:offline', user.sub);
    });
  });

  return io;
}
