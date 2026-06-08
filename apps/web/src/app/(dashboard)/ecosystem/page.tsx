'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, Brain, BookOpen, Zap, Users, BarChart3,
  Mic, ShoppingBag, Activity, Target, TrendingUp, Loader2,
  CheckCircle2, ArrowRight, Star, Trophy, Map, GraduationCap,
  RefreshCw, Building2, Cpu,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CrossRec { type: string; message: string; action: string; href: string }
interface EcosystemMe {
  profile: { learningDna: { style: string; interactionCount: number }; avgMastery: number; weakTopics: string[] };
  xp: { level: number; xp: number; rank: string; streak: number } | null;
  analytics: { totalMessages: number; totalQuizzes: number } | null;
  recentCourses: { id: string; title: string; slug: string }[];
  crossRecommendations: CrossRec[];
}

const MODULE_ICONS: Record<string, typeof Brain> = {
  'lms': BookOpen, 'document': BookOpen, 'ai-chatbox': Brain, 'knowledge-graph': Map,
  'adaptive-learning': Target, 'learning-dna': Star, 'gamification': Trophy,
  'voice-learning': Mic, 'course-generator': Sparkles, 'marketplace': ShoppingBag,
  'analytics': BarChart3, 'monitoring': Activity, 'enterprise': Building2, 'ai-feedback': CheckCircle2,
};

const REC_ICONS: Record<string, typeof Brain> = {
  adaptive: Target, quiz: Trophy, marketplace: ShoppingBag, career: GraduationCap,
};

const STYLE_MAP: Record<string, { label: string; color: string; desc: string }> = {
  visual:   { label: 'Visual Learner',   color: 'text-blue-500',   desc: 'Học qua sơ đồ & hình ảnh' },
  reading:  { label: 'Reading Learner',  color: 'text-green-500',  desc: 'Học qua đọc & chi tiết' },
  practice: { label: 'Practice Learner', color: 'text-orange-500', desc: 'Học qua luyện tập' },
  mixed:    { label: 'Mixed Learner',    color: 'text-purple-500', desc: 'Phong cách kết hợp' },
};

export default function EcosystemPage() {
  const [data, setData]     = useState<EcosystemMe | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get<EcosystemMe>('/ai/ecosystem/me');
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const style = data?.profile.learningDna.style ?? 'mixed';
  const styleInfo = STYLE_MAP[style] ?? STYLE_MAP.mixed;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AI Learning Ecosystem</h1>
          </div>
          <p className="text-sm text-gray-500">Tổng quan toàn bộ hành trình học tập AI của bạn</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {data && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-primary">{data.profile.avgMastery}%</p>
              <p className="text-xs text-gray-500 mt-1">Mức độ thành thạo</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">Lv.{data.xp?.level ?? 1}</p>
              <p className="text-xs text-gray-500 mt-1">{data.xp?.rank ?? 'Học sinh'}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{data.xp?.streak ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Ngày streak 🔥</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-purple-500">{data.profile.learningDna.interactionCount}</p>
              <p className="text-xs text-gray-500 mt-1">Lượt học</p>
            </div>
          </div>

          {/* Learning DNA */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-yellow-500" />
              <h2 className="font-semibold">Learning DNA của bạn</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn('text-4xl font-black', styleInfo.color)}>
                {style === 'visual' ? '👁️' : style === 'reading' ? '📖' : style === 'practice' ? '🎯' : '⚡'}
              </div>
              <div>
                <p className={cn('font-bold text-lg', styleInfo.color)}>{styleInfo.label}</p>
                <p className="text-sm text-gray-500">{styleInfo.desc}</p>
              </div>
            </div>
            {data.profile.weakTopics.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-500 mb-2">Cần cải thiện:</p>
                <div className="flex flex-wrap gap-2">
                  {data.profile.weakTopics.map(t => (
                    <span key={t} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cross-System Recommendations */}
          {data.crossRecommendations.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />AI đề xuất cho bạn
              </h2>
              {data.crossRecommendations.map((r, i) => {
                const Icon = REC_ICONS[r.type] ?? Target;
                return (
                  <Link key={i} href={r.href}
                    className="flex items-center gap-4 bg-gradient-to-r from-primary/5 to-purple-50 border border-primary/10 rounded-xl p-4 hover:shadow-md transition-shadow group">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.action}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Recent Courses */}
          {data.recentCourses.length > 0 && (
            <div>
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-primary" />Khóa học đang học
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.recentCourses.map(c => (
                  <Link key={c.id} href={`/learn/${c.slug}`}
                    className="flex items-center gap-3 bg-white border rounded-xl p-3 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{c.title}</p>
                    <ArrowRight className="h-4 w-4 text-gray-400 ml-auto shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Ecosystem Map */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Cpu className="h-5 w-5 text-primary" />Hệ sinh thái AI
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'ai-chatbox',        label: 'AI Tutor',         href: '/dashboard',           color: 'bg-blue-50 border-blue-100' },
            { id: 'knowledge-graph',   label: 'Knowledge Map',    href: '/learning/knowledge-graph', color: 'bg-purple-50 border-purple-100' },
            { id: 'adaptive-learning', label: 'Học thích ứng',    href: '/learning/coach',       color: 'bg-green-50 border-green-100' },
            { id: 'voice-learning',    label: 'Voice Learning',   href: '/language/coach',       color: 'bg-cyan-50 border-cyan-100' },
            { id: 'gamification',      label: 'Gamification',     href: '/leaderboard',          color: 'bg-yellow-50 border-yellow-100' },
            { id: 'course-generator',  label: 'Tạo khóa học AI',  href: '/ai-course',            color: 'bg-orange-50 border-orange-100' },
            { id: 'marketplace',       label: 'Marketplace',      href: '/marketplace',          color: 'bg-pink-50 border-pink-100' },
            { id: 'analytics',         label: 'Analytics',        href: '/analytics',            color: 'bg-indigo-50 border-indigo-100' },
          ].map(m => {
            const Icon = MODULE_ICONS[m.id] ?? Sparkles;
            return (
              <Link key={m.id} href={m.href}
                className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border hover:shadow-md transition-shadow text-center', m.color)}>
                <Icon className="h-6 w-6 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
