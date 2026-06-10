import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { randomUUID } from 'crypto';
import { redis } from '../services/redis';
import { Message } from '../services/mongo';
import { prisma } from '../services/prisma';
import { env } from '../config/env';
import { awardXP } from '../services/xp-gamification';
import type { FastifyInstance } from 'fastify';

// ── Battle Quiz helpers ───────────────────────────────────────────
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

type BattleSubject = 'math' | 'language' | 'viet';
interface BattleQuestion { q: string; options: string[]; answer: number; }
interface BattlePlayer { userId: string; name: string; score: number; }
interface BattleRoom {
  id: string; code: string;
  subject: BattleSubject;
  players: BattlePlayer[];
  questions: BattleQuestion[];
  currentQ: number;
  answers: Record<string, number>;
  state: 'waiting' | 'playing' | 'ended';
  xpAwarded: boolean;
}

function generateMathQuestions(count = 10): BattleQuestion[] {
  return Array.from({ length: count }, () => {
    const op = ['+', '-', '×', '÷'][Math.floor(Math.random() * 4)];
    let a: number, b: number, ans: number, q: string;
    if (op === '+')  { a = rnd(1,50);  b = rnd(1,50);  ans = a+b;   q = `${a} + ${b} = ?`; }
    else if (op === '-') { a = rnd(10,50); b = rnd(1,a);   ans = a-b;   q = `${a} - ${b} = ?`; }
    else if (op === '×') { a = rnd(2,12);  b = rnd(2,12);  ans = a*b;   q = `${a} × ${b} = ?`; }
    else               { a = rnd(2,12);  b = rnd(2,12);  ans = a*b;   q = `${a*b} ÷ ${b} = ?`; }
    const wrongs = [ans+rnd(1,5), Math.max(0,ans-rnd(1,5)), ans+rnd(6,12)];
    const options = shuffle([ans, ...wrongs]);
    return { q, options: options.map(String), answer: options.indexOf(ans) };
  });
}

async function generateLanguageQuestions(count = 10): Promise<BattleQuestion[]> {
  const total = await prisma.vocabItem.count();
  if (total < 4) return generateMathQuestions(count);

  const skip = Math.max(0, Math.floor(Math.random() * (total - count * 4)));
  const pool = await prisma.vocabItem.findMany({
    take: Math.min(count * 4, total),
    skip,
    select: { word: true, translation: true },
  });

  if (pool.length < 4) return generateMathQuestions(count);

  const questions: BattleQuestion[] = [];
  const shuffled = shuffle(pool);
  for (let i = 0; i + 3 < shuffled.length && questions.length < count; i += 4) {
    const correct = shuffled[i];
    const wrongs = [shuffled[i+1].translation, shuffled[i+2].translation, shuffled[i+3].translation];
    const options = shuffle([correct.translation, ...wrongs]);
    questions.push({
      q: `"${correct.word}" nghĩa là gì?`,
      options,
      answer: options.indexOf(correct.translation),
    });
  }

  while (questions.length < count) questions.push(...generateMathQuestions(1));
  return questions.slice(0, count);
}

async function generateVietQuestions(count = 10): Promise<BattleQuestion[]> {
  const total = await prisma.vietItem.count();
  if (total < 4) return generateMathQuestions(count);

  const skip = Math.max(0, Math.floor(Math.random() * (total - count * 4)));
  const pool = await prisma.vietItem.findMany({
    take: Math.min(count * 4, total),
    skip,
    select: { word: true, meaning: true },
  });

  if (pool.length < 4) return generateMathQuestions(count);

  const questions: BattleQuestion[] = [];
  const shuffled = shuffle(pool);
  for (let i = 0; i + 3 < shuffled.length && questions.length < count; i += 4) {
    const correct = shuffled[i];
    const wrongs = [shuffled[i+1].meaning, shuffled[i+2].meaning, shuffled[i+3].meaning];
    const options = shuffle([correct.meaning, ...wrongs]);
    questions.push({
      q: `"${correct.word}" có nghĩa là gì?`,
      options,
      answer: options.indexOf(correct.meaning),
    });
  }

  while (questions.length < count) questions.push(...generateMathQuestions(1));
  return questions.slice(0, count);
}

async function generateQuestions(subject: BattleSubject, count = 10): Promise<BattleQuestion[]> {
  if (subject === 'language') return generateLanguageQuestions(count);
  if (subject === 'viet') return generateVietQuestions(count);
  return generateMathQuestions(count);
}

const BATTLE_KEY = (id: string) => `battle:room:${id}`;
const BATTLE_CODE_KEY = (c: string) => `battle:code:${c}`;
const BATTLE_TTL = 3600;
const BATTLE_Q_TOTAL = 10;

async function getBattleRoom(roomId: string): Promise<BattleRoom | null> {
  const raw = await redis.get(BATTLE_KEY(roomId));
  return raw ? JSON.parse(raw) : null;
}
async function saveBattleRoom(room: BattleRoom) {
  await redis.set(BATTLE_KEY(room.id), JSON.stringify(room), 'EX', BATTLE_TTL);
}

export function setupSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: { origin: [env.FRONTEND_URL, 'http://localhost:3000'], credentials: true },
    transports: ['websocket', 'polling'],
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = (app as any).jwt.verify(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = (socket as any).user as { sub: string; role: string; name?: string; avatarUrl?: string };
    const dbUser = await prisma.user.findUnique({ where: { id: user.sub }, select: { name: true, avatarUrl: true } });
    user.name = dbUser?.name ?? user.name;
    user.avatarUrl = dbUser?.avatarUrl ?? undefined;
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
        userName: user.name || user.sub,
        avatarUrl: user.avatarUrl,
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

    // ── Battle Quiz ───────────────────────────────────────────────
    socket.on('battle:create', async ({ subject = 'math' }: { subject?: BattleSubject } = {}) => {
      const validSubject: BattleSubject = ['math', 'language', 'viet'].includes(subject) ? subject : 'math';
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      const roomId = randomUUID();
      const questions = await generateQuestions(validSubject, BATTLE_Q_TOTAL);
      const room: BattleRoom = {
        id: roomId, code,
        subject: validSubject,
        players: [{ userId: user.sub, name: user.name || 'Player 1', score: 0 }],
        questions,
        currentQ: 0, answers: {}, state: 'waiting', xpAwarded: false,
      };
      await saveBattleRoom(room);
      await redis.set(BATTLE_CODE_KEY(code), roomId, 'EX', BATTLE_TTL);
      socket.join(`battle:${roomId}`);
      socket.emit('battle:created', { roomId, code, subject: validSubject });
    });

    socket.on('battle:join', async ({ code }: { code: string }) => {
      const roomId = await redis.get(BATTLE_CODE_KEY(code?.toUpperCase?.() ?? ''));
      if (!roomId) { socket.emit('battle:error', 'Không tìm thấy phòng với mã này'); return; }

      const room = await getBattleRoom(roomId);
      if (!room) { socket.emit('battle:error', 'Phòng không tồn tại'); return; }
      if (room.state !== 'waiting') { socket.emit('battle:error', 'Trận đấu đã bắt đầu rồi'); return; }
      if (room.players.length >= 2) { socket.emit('battle:error', 'Phòng đã đầy (2/2)'); return; }
      if (room.players.some(p => p.userId === user.sub)) { socket.emit('battle:error', 'Bạn đã ở trong phòng này'); return; }

      room.players.push({ userId: user.sub, name: user.name || 'Player 2', score: 0 });
      socket.join(`battle:${roomId}`);

      if (room.players.length === 2) {
        room.state = 'playing';
        await saveBattleRoom(room);
        io.to(`battle:${roomId}`).emit('battle:start', { roomId, players: room.players, total: BATTLE_Q_TOTAL, subject: room.subject });
        setTimeout(async () => {
          const r = await getBattleRoom(roomId);
          if (!r) return;
          io.to(`battle:${roomId}`).emit('battle:question', {
            index: 0, total: BATTLE_Q_TOTAL, q: r.questions[0].q, options: r.questions[0].options, timeLimit: 10,
          });
        }, 1500);
      } else {
        await saveBattleRoom(room);
        io.to(`battle:${roomId}`).emit('battle:joined', { roomId, players: room.players });
      }
    });

    socket.on('battle:answer', async ({ roomId, answerIdx }: { roomId: string; answerIdx: number }) => {
      const room = await getBattleRoom(roomId);
      if (!room || room.state !== 'playing') return;
      if (room.currentQ >= BATTLE_Q_TOTAL) return;
      if (room.answers[user.sub] !== undefined) return;

      room.answers[user.sub] = answerIdx;
      await saveBattleRoom(room);
      socket.to(`battle:${roomId}`).emit('battle:opponent_answered');

      const allAnswered = room.players.every(p => room.answers[p.userId] !== undefined);
      if (!allAnswered) return;

      const correctIdx = room.questions[room.currentQ].answer;
      room.players.forEach(p => { if (room.answers[p.userId] === correctIdx) p.score++; });

      const qResult = {
        correctIdx,
        answers: { ...room.answers },
        scores: Object.fromEntries(room.players.map(p => [p.userId, p.score])),
      };
      room.currentQ++;
      room.answers = {};

      if (room.currentQ >= BATTLE_Q_TOTAL) {
        room.state = 'ended';
        if (!room.xpAwarded) {
          room.xpAwarded = true;
          const sorted = [...room.players].sort((a, b) => b.score - a.score);
          const winner = sorted[0].score > sorted[1].score ? sorted[0].userId : null;
          await saveBattleRoom(room);
          const xpGain: Array<{ userId: string; xp: number }> = [];
          for (const p of room.players) {
            const xp = p.userId === winner ? 80 : winner === null ? 50 : 30;
            await awardXP(p.userId, 'battle_quiz', xp);
            xpGain.push({ userId: p.userId, xp });
          }
          io.to(`battle:${roomId}`).emit('battle:q_result', qResult);
          setTimeout(() => {
            io.to(`battle:${roomId}`).emit('battle:end', {
              winner,
              scores: Object.fromEntries(room.players.map(p => [p.userId, p.score])),
              players: room.players,
              xpGain,
            });
          }, 2500);
        }
      } else {
        await saveBattleRoom(room);
        io.to(`battle:${roomId}`).emit('battle:q_result', qResult);
        setTimeout(async () => {
          const r = await getBattleRoom(roomId);
          if (!r || r.state !== 'playing') return;
          const q = r.questions[r.currentQ];
          io.to(`battle:${roomId}`).emit('battle:question', {
            index: r.currentQ, total: BATTLE_Q_TOTAL, q: q.q, options: q.options, timeLimit: 10,
          });
        }, 2500);
      }
    });

    socket.on('disconnect', async () => {
      redis.srem('online_users', user.sub);
      io.emit('user:offline', user.sub);

      // Notify battle room if player disconnects mid-game
      const battleRooms = Array.from(socket.rooms).filter(r => r.startsWith('battle:'));
      for (const roomKey of battleRooms) {
        const roomId = roomKey.replace('battle:', '');
        const room = await getBattleRoom(roomId);
        if (room && room.state === 'playing') {
          socket.to(roomKey).emit('battle:opponent_left', { userId: user.sub });
        }
      }
    });
  });

  return io;
}
