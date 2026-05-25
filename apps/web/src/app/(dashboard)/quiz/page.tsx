'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Clock, Users, ChevronRight, Loader2, Search, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface QuizSet {
  id: string;
  title: string;
  description?: string;
  topic: string;
  isPublic: boolean;
  timeLimit?: number;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string };
  _count: { questions: number; attempts: number };
}

const TOPIC_COLORS = [
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-purple-50 text-purple-700 border-purple-200',
];

function topicColor(topic: string) {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  return TOPIC_COLORS[Math.abs(hash) % TOPIC_COLORS.length];
}

export default function QuizPage() {
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState('');

  useEffect(() => {
    api.get<QuizSet[]>(`/quiz${activeTopic ? `?topic=${encodeURIComponent(activeTopic)}` : ''}`).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setSets(list);
      const uniqueTopics = [...new Set(list.map((q) => q.topic))];
      setTopics(uniqueTopics);
    }).finally(() => setLoading(false));
  }, [activeTopic]);

  const filtered = sets.filter((s) =>
    search ? s.title.toLowerCase().includes(search.toLowerCase()) || s.topic.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Trò chơi Quiz</h1>
            <p className="text-sm text-gray-500">Ôn tập kiến thức theo chủ đề</p>
          </div>
        </div>
      </div>

      {/* Search + topic filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm quiz..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setActiveTopic('')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              activeTopic === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>
            Tất cả
          </button>
          {topics.map((t) => (
            <button key={t} onClick={() => setActiveTopic(t)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                activeTopic === t ? 'bg-indigo-600 text-white border-indigo-600' : cn('bg-white border-gray-200 hover:border-indigo-300', topicColor(t)))}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Gamepad2 className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Chưa có quiz nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((quiz) => (
            <Link key={quiz.id} href={`/quiz/${quiz.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all group space-y-3">
              {/* Topic badge */}
              <span className={cn('inline-flex text-[10px] font-semibold border rounded-full px-2 py-0.5', topicColor(quiz.topic))}>
                {quiz.topic}
              </span>

              {/* Title */}
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors line-clamp-2">{quiz.title}</p>
                {quiz.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{quiz.description}</p>}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Gamepad2 className="h-3.5 w-3.5" />{quiz._count.questions} câu</span>
                {quiz.timeLimit && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{quiz.timeLimit}s/câu</span>}
                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" />{quiz._count.attempts} lượt</span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {quiz.author.avatarUrl
                      ? <img src={quiz.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                      : <span className="text-[9px] font-bold text-indigo-700">{quiz.author.name[0]}</span>}
                  </div>
                  <p className="text-xs text-gray-500">{quiz.author.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
