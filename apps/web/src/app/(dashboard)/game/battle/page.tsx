'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Swords, Plus, LogIn, Loader2, Star, Trophy, Crown, Timer } from 'lucide-react';
import { useSocketStore } from '@/stores/socket.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

interface Player { userId: string; name: string; score: number; }
interface Question { index: number; total: number; q: string; options: string[]; timeLimit: number; }
interface QResult { correctIdx: number; answers: Record<string, number>; scores: Record<string, number>; }
interface EndResult { winner: string | null; scores: Record<string, number>; players: Player[]; xpGain: Array<{ userId: string; xp: number }>; }

type Phase = 'lobby' | 'waiting_room' | 'starting' | 'question' | 'result' | 'ended';

export default function BattlePage() {
  const { socket } = useSocketStore();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [inputCode, setInputCode] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [qResult, setQResult] = useState<QResult | null>(null);
  const [endResult, setEndResult] = useState<EndResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAnsweredRef = useRef(false);

  const myId = user?.id ?? '';

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

  useEffect(() => {
    if (!socket) return;

    socket.on('battle:created', ({ roomId: rid, code }: { roomId: string; code: string }) => {
      setRoomId(rid); setRoomCode(code); setPhase('waiting_room');
    });

    socket.on('battle:joined', ({ players: pl }: { players: Player[] }) => {
      setPlayers(pl);
    });

    socket.on('battle:error', (msg: string) => {
      setError(msg);
    });

    socket.on('battle:start', ({ players: pl }: { players: Player[]; roomId: string; total: number }) => {
      setPlayers(pl); setPhase('starting');
      setTimeout(() => setPhase('question'), 1200);
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

    socket.on('battle:opponent_answered', () => {
      setOpponentAnswered(true);
    });

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

    return () => {
      socket.off('battle:created');
      socket.off('battle:joined');
      socket.off('battle:error');
      socket.off('battle:start');
      socket.off('battle:question');
      socket.off('battle:opponent_answered');
      socket.off('battle:q_result');
      socket.off('battle:end');
      clearTimer();
    };
  }, [socket, clearTimer, startTimer, submitAnswer]);

  const handleCreate = () => {
    if (!socket) { setError('Chưa kết nối. Vui lòng thử lại.'); return; }
    setError('');
    socket.emit('battle:create');
  };

  const handleJoin = () => {
    if (!inputCode.trim()) { setError('Nhập mã phòng'); return; }
    if (!socket) { setError('Chưa kết nối. Vui lòng thử lại.'); return; }
    setError('');
    socket.emit('battle:join', { code: inputCode.trim().toUpperCase() });
  };

  const reset = () => {
    clearTimer();
    setPhase('lobby'); setRoomId(''); setRoomCode(''); setPlayers([]);
    setQuestion(null); setQResult(null); setEndResult(null); setSelectedAnswer(null);
    setInputCode(''); setError(''); setOpponentAnswered(false);
    hasAnsweredRef.current = false;
  };

  // ── Lobby ──────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/game" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
          <Swords className="w-6 h-6 text-violet-600" />
          <h1 className="text-2xl font-black text-gray-900">Battle Quiz</h1>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-center space-y-2">
          <p className="text-gray-600 text-sm">Thách đấu bạn bè realtime — 10 câu Toán tốc độ</p>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>🏆 Thắng: +80 XP</span>
            <span>🤝 Hoà: +50 XP</span>
            <span>💪 Thua: +30 XP</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={handleCreate}
            className="rounded-2xl border-2 border-violet-300 p-6 text-left hover:border-violet-500 hover:bg-violet-50 transition">
            <Plus className="w-8 h-8 text-violet-600 mb-3" />
            <h3 className="font-bold text-gray-900">Tạo phòng</h3>
            <p className="text-sm text-gray-500 mt-1">Tạo phòng và gửi mã cho bạn bè</p>
          </button>
          <div className="rounded-2xl border-2 border-teal-300 p-6 hover:border-teal-500 hover:bg-teal-50 transition">
            <LogIn className="w-8 h-8 text-teal-600 mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">Vào phòng</h3>
            <input value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã phòng"
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="w-full border rounded-xl px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400 mb-2" />
            <button onClick={handleJoin}
              className="w-full py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700">
              Vào phòng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting room ───────────────────────────────────────────────
  if (phase === 'waiting_room') {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <Swords className="w-12 h-12 text-violet-500 mx-auto" />
        <h2 className="text-2xl font-black text-gray-900">Đang chờ đối thủ…</h2>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Mã phòng</p>
          <p className="text-4xl font-black font-mono tracking-widest text-violet-700">{roomCode}</p>
          <p className="text-sm text-gray-500 mt-3">Gửi mã này cho bạn bè để họ tham gia</p>
        </div>
        <div className="flex justify-center gap-3">
          {players.map(p => (
            <div key={p.userId} className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black',
              p.userId === myId ? 'bg-violet-100' : 'bg-gray-100')}>
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {players.length < 2 && (
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">{players.length}/2 người chơi</p>
        <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Huỷ</button>
      </div>
    );
  }

  // ── Starting ───────────────────────────────────────────────────
  if (phase === 'starting') {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center space-y-6">
        <div className="flex justify-center items-center gap-4">
          <PlayerBadge player={players[0]} myId={myId} side="left" />
          <Swords className="w-10 h-10 text-violet-500" />
          <PlayerBadge player={players[1]} myId={myId} side="right" />
        </div>
        <p className="text-2xl font-black text-gray-900 animate-pulse">Trận đấu bắt đầu!</p>
      </div>
    );
  }

  // ── Question ───────────────────────────────────────────────────
  if (phase === 'question' && question) {
    const timerColor = timeLeft <= 3 ? 'text-red-500' : timeLeft <= 5 ? 'text-yellow-500' : 'text-gray-700';
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 font-medium">Câu {question.index + 1}/{question.total}</div>
          <div className={cn('flex items-center gap-1.5 font-black text-xl', timerColor)}>
            <Timer className="w-5 h-5" />
            {timeLeft}s
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-1000"
            style={{ width: `${((question.index) / question.total) * 100}%` }} />
        </div>

        {/* Scores */}
        <div className="flex justify-between">
          {players.map(p => (
            <div key={p.userId} className={cn('text-center px-4 py-2 rounded-xl',
              p.userId === myId ? 'bg-violet-50' : 'bg-gray-50')}>
              <p className="text-xs text-gray-400 truncate max-w-[80px]">{p.userId === myId ? 'Bạn' : p.name}</p>
              <p className="text-xl font-black text-gray-900">{p.score}</p>
            </div>
          ))}
        </div>

        {/* Question */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-center">
          <p className="text-3xl font-black text-white">{question.q}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt, i) => (
            <button key={i} onClick={() => submitAnswer(i)}
              disabled={selectedAnswer !== null}
              className={cn(
                'py-4 rounded-2xl border-2 text-lg font-bold transition',
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
            Đối thủ đã trả lời! Nhanh lên!
          </p>
        )}
        {selectedAnswer !== null && !opponentAnswered && (
          <p className="text-center text-sm text-gray-400">Chờ đối thủ trả lời…</p>
        )}
      </div>
    );
  }

  // ── Q Result ───────────────────────────────────────────────────
  if (phase === 'result' && qResult && question) {
    const myAnswer = qResult.answers[myId] ?? -1;
    const myScore = qResult.scores[myId] ?? 0;
    const correct = myAnswer === qResult.correctIdx;
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 text-center">
        <div className={cn('text-5xl font-black', correct ? 'text-green-500' : 'text-red-500')}>
          {correct ? '✓' : '✗'}
        </div>
        <p className={cn('text-xl font-bold', correct ? 'text-green-700' : 'text-red-600')}>
          {correct ? 'Chính xác!' : 'Sai rồi!'}
        </p>
        {!correct && (
          <p className="text-sm text-gray-500">Đáp án đúng: <strong>{question.options[qResult.correctIdx]}</strong></p>
        )}
        <div className="flex justify-center gap-6 mt-2">
          {players.map(p => (
            <div key={p.userId} className={cn('text-center px-5 py-3 rounded-2xl border',
              p.userId === myId ? 'border-violet-200 bg-violet-50' : 'border-gray-100 bg-gray-50')}>
              <p className="text-xs text-gray-400">{p.userId === myId ? 'Bạn' : p.name}</p>
              <p className="text-2xl font-black text-gray-900">{qResult.scores[p.userId] ?? 0}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 animate-pulse mt-2">Câu tiếp theo sắp xuất hiện…</p>
      </div>
    );
  }

  // ── Ended ──────────────────────────────────────────────────────
  if (phase === 'ended' && endResult) {
    const isWinner = endResult.winner === myId;
    const isTie = endResult.winner === null;
    const myXP = endResult.xpGain.find(x => x.userId === myId)?.xp ?? 0;
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <div className="text-6xl">{isTie ? '🤝' : isWinner ? '🏆' : '💪'}</div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">
            {isTie ? 'Hoà!' : isWinner ? 'Bạn thắng!' : 'Thua lần này!'}
          </h2>
          <p className="text-gray-500 mt-1">{isTie ? 'Trận đấu ngang tài ngang sức!' : isWinner ? 'Tuyệt vời, bạn đã thống trị!' : 'Luyện tập thêm để trở nên mạnh hơn!'}</p>
        </div>

        <div className="rounded-2xl border bg-amber-50 px-6 py-4 inline-flex items-center gap-2 mx-auto">
          <Star className="w-5 h-5 text-amber-500" />
          <span className="text-xl font-black text-amber-700">+{myXP} XP</span>
        </div>

        {/* Final scores */}
        <div className="rounded-2xl border bg-white divide-y">
          {endResult.players.sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 px-5 py-3">
              {i === 0 ? <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                : <Trophy className="w-5 h-5 text-gray-300 shrink-0" />}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-gray-800">
                  {p.userId === myId ? 'Bạn' : p.name}
                </p>
              </div>
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

  // fallback loading
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );
}

function PlayerBadge({ player, myId, side }: { player?: Player; myId: string; side: 'left' | 'right' }) {
  if (!player) return <div className="w-16 h-16 rounded-2xl bg-gray-100" />;
  return (
    <div className={cn('flex flex-col items-center gap-2', side === 'right' && 'flex-col-reverse text-right')}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-3xl font-black text-white">
        {player.name.charAt(0).toUpperCase()}
      </div>
      <p className="text-sm font-semibold text-gray-700">{player.userId === myId ? 'Bạn' : player.name}</p>
    </div>
  );
}
