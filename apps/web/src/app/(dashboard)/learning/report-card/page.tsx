'use client';

import { useEffect, useState } from 'react';
import { Award, TrendingUp, TrendingDown, BookOpen, MessageSquare, Mic, ClipboardList, Flame, Trophy, RefreshCw, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getReportCard, type ReportCard } from '@/services/gamification';

const SUBJECTS = [
  { key: 'general', label: 'Tổng hợp' },
  { key: 'math',    label: 'Toán' },
  { key: 'viet',    label: 'Tiếng Việt' },
  { key: 'language', label: 'Ngoại ngữ' },
];

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'A':  'text-green-600 bg-green-50 border-green-200',
  'B':  'text-blue-600 bg-blue-50 border-blue-200',
  'C':  'text-amber-600 bg-amber-50 border-amber-200',
  'D':  'text-orange-600 bg-orange-50 border-orange-200',
  'F':  'text-red-600 bg-red-50 border-red-200',
};

function MasteryBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-700 truncate max-w-[180px]" title={label}>{label}</span>
        <span className="font-semibold text-gray-800">{score}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ReportCardPage() {
  const [subject, setSubject] = useState('general');
  const [card, setCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (s: string) => {
    setLoading(true);
    try {
      setCard(await getReportCard(s));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(subject); }, [subject]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Bảng điểm AI
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tổng hợp kết quả học tập của bạn</p>
        </div>
        <button onClick={() => load(subject)} disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Subject selector */}
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map(s => (
          <button key={s.key} onClick={() => setSubject(s.key)}
            className={cn(
              'text-sm font-medium px-4 py-1.5 rounded-full border transition-all',
              subject === s.key ? 'bg-primary text-white border-primary' : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />Đang tải bảng điểm...
        </div>
      ) : !card ? null : (
        <div className="space-y-4">
          {/* Grade + Mastery Hero */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5">
            <div className={cn('h-20 w-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-bold shrink-0', GRADE_COLORS[card.grade] ?? 'text-gray-600 bg-gray-50 border-gray-200')}>
              {card.grade}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Điểm thành thạo trung bình</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{card.masteryAvg}%</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div
                  className={cn('h-full rounded-full transition-all', card.masteryAvg >= 70 ? 'bg-emerald-500' : card.masteryAvg >= 50 ? 'bg-amber-500' : 'bg-red-400')}
                  style={{ width: `${card.masteryAvg}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activity stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Chat AI', value: card.activity.chatCount, icon: MessageSquare, color: 'text-blue-600' },
              { label: 'Quiz',    value: card.activity.quizCount,     icon: ClipboardList, color: 'text-violet-600' },
              { label: 'Bài tập', value: card.activity.homeworkCount, icon: BookOpen,      color: 'text-green-600' },
              { label: 'Voice',   value: card.activity.voiceCount,    icon: Mic,           color: 'text-orange-600' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <item.icon className={cn('h-5 w-5 mx-auto mb-1', item.color)} />
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Strong topics */}
          {card.strongTopics.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h2 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />Chủ đề mạnh
              </h2>
              {card.strongTopics.map(t => <MasteryBar key={t.topic} label={t.topic} score={t.score} />)}
            </div>
          )}

          {/* Weak topics */}
          {card.weakTopics.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h2 className="text-sm font-bold text-red-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />Chủ đề cần cải thiện
              </h2>
              {card.weakTopics.map(t => <MasteryBar key={t.topic} label={t.topic} score={t.score} />)}
            </div>
          )}

          {/* Streak + Study time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <Flame className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{card.streak.current}</p>
              <p className="text-xs text-muted-foreground">Streak hiện tại</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{card.streak.best}</p>
              <p className="text-xs text-muted-foreground">Streak tốt nhất</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-gray-900">{Math.round(card.activity.studyMinutes / 60)}h</p>
              <p className="text-xs text-muted-foreground">Thời gian học</p>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />Thành tích
              </h2>
              <span className="text-xs text-muted-foreground">
                {card.achievements.unlocked}/{card.achievements.total} mở khóa
              </span>
            </div>
            {card.achievements.recent.length > 0 ? (
              <div className="space-y-2">
                {card.achievements.recent.map(a => (
                  <div key={a.id} className="flex items-start gap-2">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa có thành tích nào. Hãy bắt đầu học!</p>
            )}
          </div>

          {/* Common mistakes */}
          {card.mistakeSummary.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold mb-3 text-red-600">Lỗi thường gặp</h2>
              <div className="space-y-1.5">
                {card.mistakeSummary.map(m => (
                  <div key={m.type} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">{m.type}</span>
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{m.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Cập nhật lúc {new Date(card.generatedAt).toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </div>
  );
}
