'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Swords, Plus, LogIn, Loader2, Star, Trophy, Crown, Timer,
  Copy, Check, Wifi, WifiOff, AlertTriangle,
} from 'lucide-react';
import { useSocketStore } from '@/stores/socket.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────
type BattleSubject = 'math' | 'language' | 'viet';
type Phase = 'lobby' | 'waiting_room' | 'starting' | 'question' | 'result' | 'ended' | 'aborted';

interface Player       { userId: string; name: string; score: number; }
interface Question     { index: number; total: number; q: string; options: string[]; timeLimit: number; }
interface QResult      { correctIdx: number; answers: Record<string, number>; scores: Record<string, number>; }
interface EndResult    { winner: string | null; scores: Record<string, number>; players: Player[]; xpGain: Array<{ userId: string; xp: number }>; }

// ── Constants ──────────────────────────────────────────────────────
const SUBJECT_OPTIONS: { value: BattleSubject; label: string; emoji: string; accent: string; card: string }[] = [
  { value: 'math',     label: 'Toán học',   emoji: '🔢', accent: 'border-yellow-400 bg-yellow-50 text-yellow-800',   card: 'from-yellow-500 to-orange-600' },
  { value: 'language', label: 'Ngoại ngữ',  emoji: '🌍', accent: 'border-emerald-400 bg-emerald-50 text-emerald-800', card: 'from-emerald-500 to-teal-600'  },
  { value: 'viet',     label: 'Tiếng Việt', emoji: '📖', accent: 'border-violet-400 bg-violet-50 text-violet-800',   card: 'from-violet-600 to-purple-700' },
];

function subjectOf(v: BattleSubject) { return SUBJECT_OPTIONS.find(s => s.value === v)!; }

// ── Component ──────────────────────────────────────────────────────
export default function BattlePage() {
  const { socket, isConnected } = useSocketStore();
  const { user } = useAuthStore();
  const myId = user?.id ?? '';

  // Phase state
  const [phase, setPhase] = useState<Phase>('lobby');

  // Lobby
  const [selectedSubject, setSelectedSubject] = useState<BattleSubject>('math');
  const [inputCode, setInputCode]             = useState('');
  const [error, setError]                     = useState('');

  // Room
  const [roomId, setRoomId]       = useState('');
  const [roomCode, setRoomCode]   = useState('');
  const [roomSubject, setRoomSubject] = useState<BattleSubject>('math');
  const [players, setPlayers]     = useState<Player[]>([]);
  const [copied, setCopied]       = useState(false);

  // Game
  const [question, setQuestion]         = useState<Question | null>(null);
  const [qResult, setQResult]           = useState<QResult | null>(null);
  const [endResult, setEndResult]       = useState<EndResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [timeLeft, setTimeLeft]         = useState(10);
  const [countdown, setCountdown]       = useState(3);

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef  = useRef(false);

  // ── Helpers ──────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((secs: number, onExpire: () => void) => {
    clearTimer();
    setTimeLeft(secs);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearTimer(); onExpire(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const submitAnswer = useCallback((idx: number) => {
    if (hasAnsweredRef.current || !socket || !roomId) return;
    hasAnsweredRef.current = true;
    clearTimer();
    setSelectedAnswer(idx);
    socket.emit('battle:answer', { roomId, answerIdx: idx });
  }, [socket, roomId, clearTimer]);

  const reset = () => {
    clearTimer();
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setPhase('lobby');
    setRoomId(''); setRoomCode(''); setPlayers([]);
    setQuestion(null); setQResult(null); setEndResult(null); setSelectedAnswer(null);
    setInputCode(''); setError(''); setOpponentAnswered(false); setRoomSubject('math');
    setCopied(false);
    hasAnsweredRef.current = false;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Socket events ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('battle:created', ({ roomId: rid, code, subject }: { roomId: string; code: string; subject: BattleSubject }) => {
      setRoomId(rid); setRoomCode(code); setRoomSubject(subject ?? 'math');
      setPhase('waiting_room');
    });

    socket.on('battle:joined', ({ roomId: rid, players: pl }: { roomId: string; players: Player[] }) => {
      setRoomId(rid); setPlayers(pl);
    });

    socket.on('battle:error', (msg: string) => setError(msg));

    socket.on('battle:start', ({ roomId: rid, players: pl, subject }: { roomId: string; players: Player[]; total: number; subject?: BattleSubject }) => {
      setRoomId(rid);
      setPlayers(pl);
      if (subject) setRoomSubject(subject);
      setCountdown(3);
      setPhase('starting');

      // 3-2-1 countdown then question
      let c = 3;
      countdownRef.current = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setPhase('question');
        }
      }, 900);
    });

    socket.on('battle:question', (q: Question) => {
      setQuestion(q);
      setQResult(null);
      setSelectedAnswer(null);
      setOpponentAnswered(false);
      hasAnsweredRef.current = false;
      setPhase('question');
      startTimer(q.timeLimit, () => submitAnswer(-1));
    });

    socket.on('battle:opponent_answered', () => setOpponentAnswered(true));

    socket.on('battle:q_result', (r: QResult) => {
      clearTimer();
      setQResult(r);
      setPhase('result');
    });

    socket.on('battle:end', (r: EndResult) => {
      setEndResult(r);
      setPlayers(r.players);
      setPhase('ended');
    });

    socket.on('battle:opponent_left', () => {
      clearTimer();
      setPhase('aborted');
    });

    return () => {
      socket.off('battle:created');
      socket.off('battle:joined');
      socket.off('battle:error');
      socket.off('battle:start');
      socket.off('battle:question');
      socket.off('battle:opponent_answered');
      socket.off('battle:q_result');
      socket.off('battle:end');
      socket.off('battle:opponent_left');
      clearTimer();
    };
  }, [socket, clearTimer, startTimer, submitAnswer]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!socket || !isConnected) { setError('Chưa kết nối mạng. Thử tải lại trang.'); return; }
    setError('');
    socket.emit('battle:create', { subject: selectedSubject });
  };

  const handleJoin = () => {
    if (!inputCode.trim()) { setError('Nhập mã phòng'); return; }
    if (!socket || !isConnected) { setError('Chưa kết nối mạng. Thử tải lại trang.'); return; }
    setError('');
    socket.emit('battle:join', { code: inputCode.trim().toUpperCase() });
  };

  // ── Render: Lobby ─────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/game" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
          <Swords className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-black text-gray-900">Battle Quiz</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            {isConnected
              ? <><Wifi className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Đã kết nối</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-400">Đang kết nối…</span></>}
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-center">
          <p className="text-gray-600 text-sm">Thách đấu bạn bè realtime — 10 câu tốc độ</p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>🏆 Thắng +80 XP</span>
            <span>🤝 Hoà +50 XP</span>
            <span>💪 Thua +30 XP</span>
          </div>
        </div>

        {/* Subject picker */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Môn học (áp dụng khi tạo phòng)</p>
          <div className="grid grid-cols-3 gap-2">
            {SUBJECT_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setSelectedSubject(s.value)}
                className={cn(
                  'rounded-xl border-2 py-3 text-center text-sm font-semibold transition',
                  selectedSubject === s.value
                    ? s.accent + ' border-current'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                )}>
                <div className="text-xl mb-1">{s.emoji}</div>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Create */}
          <button onClick={handleCreate}
            className="rounded-2xl border-2 border-violet-300 p-6 text-left hover:border-violet-500 hover:bg-violet-50 transition">
            <Plus className="w-8 h-8 text-violet-600 mb-3" />
            <h3 className="font-bold text-gray-900">Tạo phòng</h3>
            <p className="text-sm text-gray-500 mt-1">
              {subjectOf(selectedSubject).emoji} {subjectOf(selectedSubject).label}
            </p>
          </button>

          {/* Join */}
          <div className="rounded-2xl border-2 border-teal-300 p-6 hover:border-teal-500 hover:bg-teal-50 transition">
            <LogIn className="w-8 h-8 text-teal-600 mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Vào phòng</h3>
            <input
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã phòng"
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="w-full border rounded-xl px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400 mb-2"
            />
            <button onClick={handleJoin}
              className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              Vào phòng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Waiting room ───────────────────────────────────────────
  if (phase === 'waiting_room') {
    const sub = subjectOf(roomSubject);
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <Swords className="w-12 h-12 text-violet-500 mx-auto" />
        <h2 className="text-2xl font-black text-gray-900">Đang chờ đối thủ…</h2>

        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Mã phòng</p>
          <p className="text-4xl font-black font-mono tracking-widest text-violet-700">{roomCode}</p>

          <button onClick={copyCode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            {copied ? <><Check className="w-4 h-4 text-green-500" />Đã copy!</> : <><Copy className="w-4 h-4" />Copy mã</>}
          </button>

          <p className="text-sm text-gray-500">Gửi mã này cho bạn bè để họ tham gia</p>
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', sub.accent)}>
            {sub.emoji} {sub.label}
          </span>
        </div>

        <div className="flex justify-center gap-4">
          {players.map(p => (
            <div key={p.userId} className="flex flex-col items-center gap-2">
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white bg-gradient-to-br',
                p.userId === myId ? 'from-violet-400 to-purple-600' : 'from-gray-300 to-gray-400')}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs text-gray-500">{p.userId === myId ? 'Bạn' : p.name}</p>
            </div>
          ))}
          {players.length < 2 && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
              <p className="text-xs text-gray-400">Chờ…</p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500">{players.length}/2 người chơi</p>
        <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2">Huỷ phòng</button>
      </div>
    );
  }

  // ── Render: Starting countdown ─────────────────────────────────────
  if (phase === 'starting') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-8">
        <div className="flex justify-center items-center gap-6">
          <PlayerBadge player={players[0]} myId={myId} side="left" />
          <Swords className="w-10 h-10 text-violet-500 shrink-0" />
          <PlayerBadge player={players[1]} myId={myId} side="right" />
        </div>

        <div className="relative w-28 h-28 mx-auto">
          <div className="w-28 h-28 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-6xl font-black text-violet-700 tabular-nums">{countdown || 'GO!'}</span>
          </div>
        </div>

        <p className="text-lg font-semibold text-gray-500">
          {subjectOf(roomSubject).emoji} {subjectOf(roomSubject).label}
        </p>
      </div>
    );
  }

  // ── Render: Question ───────────────────────────────────────────────
  if (phase === 'question' && question) {
    const sub = subjectOf(roomSubject);
    const timerColor = timeLeft <= 3 ? 'text-red-500' : timeLeft <= 5 ? 'text-yellow-500' : 'text-gray-700';
    const qLong = question.q.length > 30;
    const optLong = question.options.some(o => o.length > 12);

    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">Câu {question.index + 1}/{question.total}</span>
          <div className={cn('flex items-center gap-1.5 font-black text-xl', timerColor)}>
            <Timer className="w-5 h-5" />
            {timeLeft}s
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${(question.index / question.total) * 100}%`, background: 'rgb(139,92,246)' }} />
        </div>

        {/* Scoreboard */}
        <div className="flex justify-between gap-2">
          {players.map(p => (
            <div key={p.userId} className={cn('flex-1 text-center px-3 py-2 rounded-xl',
              p.userId === myId ? 'bg-violet-50' : 'bg-gray-50')}>
              <p className="text-xs text-gray-400 truncate">{p.userId === myId ? 'Bạn' : p.name}</p>
              <p className="text-xl font-black text-gray-900">{p.score}</p>
            </div>
          ))}
        </div>

        {/* Question card */}
        <div className={cn('rounded-2xl bg-gradient-to-br p-5 text-center', sub.card)}>
          <p className={cn('font-black text-white leading-snug', qLong ? 'text-lg' : 'text-3xl')}>
            {question.q}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt, i) => (
            <button key={i} onClick={() => submitAnswer(i)}
              disabled={selectedAnswer !== null}
              className={cn(
                'rounded-2xl border-2 font-bold transition leading-snug',
                optLong ? 'py-3 px-3 text-sm text-left' : 'py-4 text-lg',
                selectedAnswer === null
                  ? 'border-gray-200 bg-white hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700'
                  : selectedAnswer === i
                    ? 'border-violet-500 bg-violet-100 text-violet-800'
                    : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
              )}>
              {opt}
            </button>
          ))}
        </div>

        {opponentAnswered && selectedAnswer === null && (
          <p className="text-center text-sm text-amber-600 font-medium animate-pulse">
            ⚡ Đối thủ đã trả lời! Nhanh lên!
          </p>
        )}
        {selectedAnswer !== null && !opponentAnswered && (
          <p className="text-center text-sm text-gray-400">Chờ đối thủ trả lời…</p>
        )}
      </div>
    );
  }

  // ── Render: Q Result ───────────────────────────────────────────────
  if (phase === 'result' && qResult && question) {
    const myAnswer = qResult.answers[myId] ?? -1;
    const correct = myAnswer === qResult.correctIdx;
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5 text-center">
        <div className={cn('text-6xl font-black', correct ? 'text-green-500' : 'text-red-500')}>
          {correct ? '✓' : '✗'}
        </div>
        <p className={cn('text-xl font-bold', correct ? 'text-green-700' : 'text-red-600')}>
          {correct ? 'Chính xác!' : 'Sai rồi!'}
        </p>
        {!correct && (
          <p className="text-sm text-gray-500">
            Đáp án: <strong className="text-gray-800">{question.options[qResult.correctIdx]}</strong>
          </p>
        )}
        <div className="flex justify-center gap-6">
          {players.map(p => (
            <div key={p.userId} className={cn('text-center px-6 py-3 rounded-2xl border',
              p.userId === myId ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-gray-50')}>
              <p className="text-xs text-gray-400 mb-1">{p.userId === myId ? 'Bạn' : p.name}</p>
              <p className="text-2xl font-black text-gray-900">{qResult.scores[p.userId] ?? 0}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 animate-pulse">Câu tiếp theo sắp xuất hiện…</p>
      </div>
    );
  }

  // ── Render: Ended ──────────────────────────────────────────────────
  if (phase === 'ended' && endResult) {
    const isWinner = endResult.winner === myId;
    const isTie    = endResult.winner === null;
    const myXP     = endResult.xpGain.find(x => x.userId === myId)?.xp ?? 0;
    const sorted   = [...endResult.players].sort((a, b) => b.score - a.score);

    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <div className="text-7xl">{isTie ? '🤝' : isWinner ? '🏆' : '💪'}</div>

        <div>
          <h2 className="text-3xl font-black text-gray-900">
            {isTie ? 'Hoà!' : isWinner ? 'Bạn thắng!' : 'Thua lần này!'}
          </h2>
          <p className="text-gray-500 mt-1">
            {isTie        ? 'Trận đấu cân tài cân sức!' :
             isWinner     ? 'Xuất sắc, bạn đã chiến thắng!' :
                           'Luyện thêm để trở nên mạnh hơn!'}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border bg-amber-50">
          <Star className="w-5 h-5 text-amber-500" />
          <span className="text-xl font-black text-amber-700">+{myXP} XP</span>
        </div>

        <div className="rounded-2xl border bg-white divide-y overflow-hidden">
          {sorted.map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 px-5 py-3.5">
              {i === 0
                ? <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                : <Trophy className="w-5 h-5 text-gray-300 shrink-0" />}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <p className="flex-1 text-left font-semibold text-sm text-gray-800">
                {p.userId === myId ? 'Bạn' : p.name}
              </p>
              <p className="font-black text-xl text-gray-900">{p.score}/10</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={reset}
            className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition">
            Chơi lại
          </button>
          <Link href="/leaderboard"
            className="flex-1 py-3 rounded-2xl border font-bold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center">
            Bảng xếp hạng
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: Aborted (opponent left) ────────────────────────────────
  if (phase === 'aborted') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto" />
        <h2 className="text-2xl font-black text-gray-900">Đối thủ đã rời trận</h2>
        <p className="text-gray-500 text-sm">Trận đấu kết thúc vì đối thủ mất kết nối.</p>
        <button onClick={reset}
          className="px-8 py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition">
          Về trang Battle
        </button>
      </div>
    );
  }

  // ── Fallback loading ───────────────────────────────────────────────
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );
}

// ── Sub-component: PlayerBadge ──────────────────────────────────────
function PlayerBadge({ player, myId, side }: { player?: Player; myId: string; side: 'left' | 'right' }) {
  if (!player) return (
    <div className={cn('flex flex-col items-center gap-2', side === 'right' && 'items-end')}>
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300" />
      <p className="text-xs text-gray-400">Chờ…</p>
    </div>
  );
  return (
    <div className={cn('flex flex-col items-center gap-2', side === 'right' && 'items-end')}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-2xl font-black text-white">
        {player.name.charAt(0).toUpperCase()}
      </div>
      <p className="text-sm font-semibold text-gray-700">
        {player.userId === myId ? 'Bạn' : player.name}
      </p>
    </div>
  );
}
