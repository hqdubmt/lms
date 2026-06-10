'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sword, Trophy, CheckCircle2, XCircle, Skull, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BossInfo {
  name: string;
  emoji: string;
  hp: number;
  subjectKey: string;
}

interface BossQuestion {
  id: string;
  content: string;
  options: string[];
  answer: string;
  hints: string[];
}

interface BattleResult {
  correct: number;
  total: number;
  bossDefeated: boolean;
  damageDealt: number;
  bossHp: number;
  xpEarned: number;
}

type GameState = 'idle' | 'battle' | 'result';

const SUBJECTS = [
  { key: 'ARITHMETIC', label: 'Số học',    emoji: '🔢', desc: 'Cộng trừ nhân chia, phân số' },
  { key: 'ALGEBRA',    label: 'Đại số',    emoji: '🧮', desc: 'Phương trình, bất phương trình' },
  { key: 'GEOMETRY',   label: 'Hình học',  emoji: '📐', desc: 'Diện tích, chu vi, thể tích' },
  { key: 'STATISTICS', label: 'Xác suất',  emoji: '🎲', desc: 'Xác suất, thống kê' },
];

function HpBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = Math.max(0, Math.round((current / max) * 100));
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <span>{label}</span>
        <span>{current}/{max} HP</span>
      </div>
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BossBattlePage() {
  const [subject, setSubject] = useState('ARITHMETIC');
  const [grade, setGrade] = useState('');
  const [state, setState] = useState<GameState>('idle');
  const [boss, setBoss] = useState<BossInfo | null>(null);
  const [questions, setQuestions] = useState<BossQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bossHp, setBossHp] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; selected: string } | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startBattle = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ subject });
      if (grade) params.set('grade', grade);
      const data = await api.get<{ boss: BossInfo; questions: BossQuestion[]; message?: string }>(
        `/math/game/boss-battle?${params}`
      );
      if (!data.questions.length) {
        setError(data.message ?? 'Chưa đủ dữ liệu cho Boss này. Giáo viên cần thêm bài học.');
        setLoading(false); return;
      }
      setBoss(data.boss);
      setQuestions(data.questions);
      setBossHp(data.boss.hp);
      setAnswers({});
      setCurrent(0);
      setFeedback(null);
      setResult(null);
      setState('battle');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (option: string) => {
    if (feedback || !boss) return;
    const q = questions[current];
    const isCorrect = option.toLowerCase().trim() === q.answer.toLowerCase().trim();
    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    const damage = isCorrect ? Math.round(boss.hp / questions.length) : 0;
    setBossHp(hp => Math.max(0, hp - damage));
    setFeedback({ correct: isCorrect, selected: option });

    setTimeout(async () => {
      setFeedback(null);
      if (current + 1 >= questions.length) {
        setState('result');
        try {
          const res = await api.post<BattleResult>('/math/game/boss-battle/submit', {
            subject,
            answers: newAnswers,
            questions: questions.map(q => ({ id: q.id, answer: q.answer })),
          });
          setResult(res);
        } catch {
          const correct = questions.filter(q => (newAnswers[q.id] ?? '').toLowerCase() === q.answer.toLowerCase()).length;
          setResult({ correct, total: questions.length, bossDefeated: correct >= 7, damageDealt: correct * 10, bossHp: boss.hp, xpEarned: correct * 10 + (correct >= 7 ? 100 : 0) });
        }
      } else {
        setCurrent(c => c + 1);
      }
    }, 700);
  };

  if (state === 'idle') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        <div className="rounded-2xl bg-gradient-to-br from-red-600 to-rose-800 p-8 text-white text-center shadow-xl">
          <Sword className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-3xl font-black">Math Boss Battle</h1>
          <p className="text-white/80 mt-1">Chiến đấu với Boss — mỗi câu đúng gây sát thương!</p>
        </div>
        <div className="rounded-xl border p-5 space-y-5 bg-white">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn Boss</label>
            <div className="grid grid-cols-2 gap-3">
              {SUBJECTS.map(s => (
                <button key={s.key} onClick={() => setSubject(s.key)}
                  className={cn('p-3 rounded-xl border-2 text-left transition',
                    subject === s.key ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300')}>
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="font-bold text-sm text-gray-800">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp (tuỳ chọn)</label>
            <select value={grade} onChange={e => setGrade(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">Tất cả</option>
              {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={String(g)}>Lớp {g}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>✦ 10 câu hỏi · mỗi câu đúng gây sát thương cho Boss</p>
            <p>✦ Hạ Boss (≥7/10): <span className="font-semibold text-red-600">+100 XP bonus</span></p>
            <p>✦ Mỗi câu đúng: <span className="font-semibold text-red-600">+10 XP</span></p>
          </div>
          <button onClick={startBattle} disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Sword className="w-5 h-5" />
            {loading ? 'Đang tải...' : 'Tấn công!'}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'result' && result) {
    const subjectInfo = SUBJECTS.find(s => s.key === subject);
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
        <Link href="/math" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại Toán học
        </Link>
        <div className={cn('rounded-2xl p-8 text-white text-center shadow-xl',
          result.bossDefeated ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-gray-600 to-gray-800')}>
          <div className="text-5xl mb-3">{result.bossDefeated ? '🏆' : '💀'}</div>
          <h2 className="text-2xl font-black">{result.bossDefeated ? 'Boss bị hạ gục!' : 'Boss sống sót...'}</h2>
          <p className="text-white/80 mt-1">
            {result.correct}/{result.total} câu đúng · {result.damageDealt} sát thương
          </p>
          <p className="text-white/70 text-sm mt-1">+{result.xpEarned} XP</p>
        </div>
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <HpBar current={Math.max(0, result.bossHp - result.damageDealt)} max={result.bossHp} label={`${subjectInfo?.emoji} ${boss?.name}`} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => setState('idle')} className="flex-1 py-3 rounded-xl border hover:bg-gray-50 font-medium transition">
            Chọn Boss khác
          </button>
          <button onClick={startBattle} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center justify-center gap-2">
            <Sword className="w-4 h-4" />Tái chiến!
          </button>
        </div>
      </div>
    );
  }

  if (state === 'result' && !result) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const q = questions[current];
  if (!q || !boss) return null;
  const subjectInfo = SUBJECTS.find(s => s.key === subject);
  const hpPct = Math.round((bossHp / boss.hp) * 100);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Boss status */}
      <div className={cn('rounded-2xl p-4 transition-all',
        feedback?.correct ? 'bg-red-100 border-2 border-red-400' : 'bg-gray-900')}>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-3xl">{boss.emoji}</div>
          <div className="flex-1">
            <p className="font-black text-white text-base">{boss.name}</p>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mt-1">
              <div className={cn('h-full rounded-full transition-all duration-700',
                hpPct > 60 ? 'bg-green-500' : hpPct > 30 ? 'bg-yellow-400' : 'bg-red-500 animate-pulse')}
                style={{ width: `${hpPct}%` }} />
            </div>
          </div>
          <div className="text-white font-bold text-sm">{bossHp}/{boss.hp}</div>
        </div>
        {feedback?.correct && (
          <p className="text-red-600 text-sm font-bold text-center animate-bounce">
            💥 -{Math.round(boss.hp / questions.length)} HP!
          </p>
        )}
      </div>

      {/* Player status */}
      <div className="flex items-center gap-3 px-1">
        <Shield className="w-5 h-5 text-blue-500 shrink-0" />
        <span className="text-sm font-medium text-gray-600">Câu {current + 1}/{questions.length}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-400">{subjectInfo?.label}</span>
      </div>

      {/* Question */}
      <div className={cn(
        'rounded-2xl border-2 p-5 transition-all',
        feedback?.correct ? 'bg-green-50 border-green-400'
        : feedback && !feedback.correct ? 'bg-red-50 border-red-400'
        : 'bg-white border-gray-200'
      )}>
        <p className="text-base font-semibold text-gray-800 leading-relaxed">{q.content}</p>
        {feedback && (
          <div className="flex items-center gap-1 mt-2">
            {feedback.correct
              ? <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600 font-medium">Chính xác!</span></>
              : <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600 font-medium">Sai! Đáp án: {q.answer}</span></>
            }
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {(q.options as string[]).map(opt => {
          const selected = feedback?.selected === opt;
          const isAnswer = opt.toLowerCase() === q.answer.toLowerCase();
          return (
            <button key={opt} onClick={() => handleAnswer(opt)}
              className={cn(
                'py-3 px-3 rounded-xl text-sm font-semibold border-2 transition text-left',
                feedback
                  ? isAnswer ? 'bg-green-500 border-green-500 text-white'
                    : selected ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-white border-gray-200 hover:border-red-400 hover:bg-red-50 text-gray-800'
              )}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
