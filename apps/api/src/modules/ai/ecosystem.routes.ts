/**
 * Phase 20 — AI Learning Ecosystem
 * Unified integration endpoint: status tất cả modules,
 * cross-system recommendations, ecosystem health check.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../services/prisma';
import { redis } from '../../services/redis';
import { getSystemHealth } from '../../services/system-monitor';
import { getBrain } from '../../services/conversation-brain';
import { getDnaProfile } from '../../services/learning-dna';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getXPData } from '../../services/xp-gamification';
import { getRecommendationsV2 } from '../../services/recommendation-v2';

export async function ecosystemRoutes(app: FastifyInstance) {
  // ─── Full Ecosystem Status (admin) ──────────────────────────────────────────
  app.get('/ecosystem/status', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { role: string };
    if (!['admin', 'superadmin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const [health, userCount, courseCount, enrollCount] = await Promise.all([
      getSystemHealth(),
      prisma.user.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.enrollment.count(),
    ]);

    const modules = [
      { id: 'lms',               label: 'LMS Core',             status: 'active', description: 'Courses, Users, Enrollment, Gradebook' },
      { id: 'document',          label: 'Document Pipeline',     status: 'active', description: 'PDF/DOCX → MarkItDown → Qdrant RAG' },
      { id: 'ai-chatbox',        label: 'AI Chatbox',            status: 'active', description: 'Multi-Agent SSE Chat, Brain Memory' },
      { id: 'knowledge-graph',   label: 'Knowledge Graph',       status: 'active', description: 'Concept mapping, weak topic detection' },
      { id: 'adaptive-learning', label: 'Adaptive Learning',     status: 'active', description: 'Personalized lessons & quizzes' },
      { id: 'learning-dna',      label: 'Learning DNA',          status: 'active', description: 'Learning style profiling (Visual/Reading/Practice)' },
      { id: 'gamification',      label: 'Gamification',          status: 'active', description: 'XP, Achievements, Streak, Leaderboard' },
      { id: 'voice-learning',    label: 'Voice Learning',        status: 'active', description: 'STT/TTS, Pronunciation scoring, IELTS Coach' },
      { id: 'course-generator',  label: 'AI Course Generator',   status: 'active', description: 'Topic → Full course with quiz/homework' },
      { id: 'marketplace',       label: 'Course Marketplace',    status: 'active', description: 'Buy/sell courses, instructor earnings' },
      { id: 'analytics',         label: 'Analytics',             status: 'active', description: 'Student/Instructor/Admin dashboards' },
      { id: 'monitoring',        label: 'Monitoring',            status: 'active', description: 'Prometheus + Grafana + Loki' },
      { id: 'enterprise',        label: 'Enterprise Dashboard',  status: 'active', description: 'KPI, revenue, organization reports' },
      { id: 'ai-feedback',       label: 'AI Feedback Loop',      status: 'active', description: '👍/👎 quality scoring, improvement loop' },
    ];

    return reply.send({
      ecosystem: 'MasterLMS AI Learning Ecosystem',
      version: '2.0',
      infrastructure: health,
      stats: { users: userCount, courses: courseCount, enrollments: enrollCount },
      modules,
      generatedAt: new Date().toISOString(),
    });
  });

  // ─── Personal Ecosystem Dashboard (student) ─────────────────────────────────
  app.get('/ecosystem/me', { preHandler: requireAuth }, async (req, reply) => {
    const user = (req as any).user as { id: string };

    const subjects = ['math', 'language', 'viet', 'general'];

    // Fetch all personal data in parallel
    const [dna, analytics, xp, enrollments] = await Promise.all([
      getDnaProfile(user.id),
      getLearningAnalytics(user.id).catch(() => null),
      getXPData(user.id).catch(() => null),
      prisma.enrollment.findMany({
        where: { userId: user.id },
        take: 5,
        orderBy: { enrolledAt: 'desc' },
        include: { course: { select: { id: true, title: true, slug: true } } },
      }),
    ]);

    // Brain states for all subjects
    const brains = await Promise.all(
      subjects.map(s => getBrain(user.id, s).then(b => ({ subject: s, brain: b })).catch(() => null))
    );

    // Compute overall mastery across all subjects
    const allMastery: number[] = [];
    const allWeakTopics: string[] = [];
    for (const b of brains) {
      if (!b) continue;
      const values = Object.values(b.brain.mastery as Record<string, number>);
      allMastery.push(...values);
      const weak = Object.entries(b.brain.mastery as Record<string, number>)
        .filter(([, v]) => v < 0.5).map(([k]) => `${b.subject}:${k}`);
      allWeakTopics.push(...weak.slice(0, 2));
    }
    const avgMastery = allMastery.length
      ? allMastery.reduce((s, v) => s + v, 0) / allMastery.length
      : 0;

    // Cross-system recommendations
    const crossRecs: Array<{ type: string; message: string; action: string; href: string }> = [];

    if (avgMastery < 0.4 && allWeakTopics.length > 0) {
      crossRecs.push({
        type: 'adaptive',
        message: `Bạn đang yếu ở ${allWeakTopics.slice(0, 2).join(', ')}`,
        action: 'Học bài thích ứng',
        href: '/learning/coach',
      });
    }
    if (dna.style === 'practice' && xp && (xp as any).level < 5) {
      crossRecs.push({
        type: 'quiz',
        message: 'Phong cách học của bạn phù hợp với luyện tập',
        action: 'Làm quiz ngay',
        href: '/quiz',
      });
    }
    if (enrollments.length === 0) {
      crossRecs.push({
        type: 'marketplace',
        message: 'Bắt đầu hành trình học tập',
        action: 'Khám phá khóa học',
        href: '/marketplace',
      });
    }
    if (dna.interactionCount > 5 && dna.topSubject) {
      crossRecs.push({
        type: 'career',
        message: `Bạn học giỏi ${dna.topSubject} — xem lộ trình nghề nghiệp`,
        action: 'Career Advisor',
        href: '/learning/career',
      });
    }

    return reply.send({
      profile: {
        learningDna: dna,
        avgMastery: Math.round(avgMastery * 100),
        weakTopics: allWeakTopics.slice(0, 5),
      },
      xp,
      analytics,
      recentCourses: enrollments.map(e => e.course),
      crossRecommendations: crossRecs,
      generatedAt: new Date().toISOString(),
    });
  });

  // ─── Ecosystem health (public lightweight) ──────────────────────────────────
  app.get('/ecosystem/health', async (_req, reply) => {
    const health = await getSystemHealth();
    return reply.send({
      status: health.status,
      uptime: health.uptimeSeconds,
      components: health.components.map(c => ({ name: c.name, status: c.status })),
    });
  });
}
