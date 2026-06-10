// Learning Flow PSv1 — Progress System V1
// Không thay đổi module cũ. Chỉ bổ sung điều phối.

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getLearningState, updateLearningState } from '../../services/learning-state';
import { getRecommendationsV2 } from '../../services/recommendation-v2';
import { awardXP, getXPData } from '../../services/xp-gamification';
import { getStreak, recordActiveDay } from '../../services/streak';
import { checkAndUnlockAchievements } from '../../services/achievement';

type Subject = 'language' | 'math' | 'viet' | 'general';
const SUBJECTS: Subject[] = ['language', 'math', 'viet'];

const SUBJECT_LABELS: Record<Subject, string> = {
  language: 'Ngoại ngữ',
  math: 'Toán học',
  viet: 'Tiếng Việt',
  general: 'Chung',
};

const MASTERY_LABEL = (score: number) => {
  if (score <= 20) return 'Beginner';
  if (score <= 40) return 'Basic';
  if (score <= 60) return 'Developing';
  if (score <= 80) return 'Proficient';
  return 'Mastered';
};

// PSv1 Level System — 10 levels
const PSV1_LEVELS = [
  { level: 1,  name: 'Beginner',    minXP: 0 },
  { level: 2,  name: 'Explorer',    minXP: 150 },
  { level: 3,  name: 'Learner',     minXP: 400 },
  { level: 4,  name: 'Scholar',     minXP: 800 },
  { level: 5,  name: 'Advanced',    minXP: 1500 },
  { level: 6,  name: 'Expert',      minXP: 2500 },
  { level: 7,  name: 'Master',      minXP: 4000 },
  { level: 8,  name: 'Grand Master', minXP: 6000 },
  { level: 9,  name: 'Legend',      minXP: 9000 },
  { level: 10, name: 'Ultimate',    minXP: 13000 },
];

function getPSv1Level(totalXP: number): { level: number; name: string; xpToNext: number } {
  let current = PSV1_LEVELS[0];
  for (const l of PSV1_LEVELS) {
    if (totalXP >= l.minXP) current = l;
    else break;
  }
  const nextIdx = PSV1_LEVELS.findIndex(l => l.level === current.level) + 1;
  const xpToNext = nextIdx < PSV1_LEVELS.length
    ? PSV1_LEVELS[nextIdx].minXP - totalXP
    : 0;
  return { level: current.level, name: current.name, xpToNext: Math.max(0, xpToNext) };
}

// XP chuẩn PSv1
const XP_TABLE: Record<string, number> = {
  lesson:      5,
  exercise:    10,
  quiz:        15,
  game:        10,
  perfect:     25,
  perfect_game: 25,
  streak:      20,
};

// Streak bonus XP theo PSv1
function getStreakBonus(days: number): number {
  if (days >= 30) return 100;
  if (days >= 7)  return 20;
  if (days >= 3)  return 10;
  return 0;
}

// Mastery delta theo activity type (PSv1 formula)
const MASTERY_DELTA: Record<string, number> = {
  lesson:   2,
  exercise: 5,
  quiz:     8,
  game:     3,
};

export async function learningFlowRoutes(app: FastifyInstance) {
  // GET /learning/progress — PSv1 progress model
  app.get('/progress', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const [xpData, streakData, ...masteryStates] = await Promise.all([
      getXPData(sub),
      getStreak(sub),
      ...SUBJECTS.map(s => getLearningState(sub, s)),
    ]);

    const mastery: Record<string, number> = {};
    SUBJECTS.forEach((s, i) => {
      mastery[s] = masteryStates[i].progress ?? 0;
    });

    const psv1 = getPSv1Level(xpData.totalXP);

    return reply.send({
      xp: xpData.totalXP,
      level: psv1.level,
      levelName: psv1.name,
      xpToNextLevel: psv1.xpToNext,
      streak: streakData.currentStreak,
      bestStreak: streakData.bestStreak,
      mastery,
    });
  });

  // GET /learning/xp — XP + level data
  app.get('/xp', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const xpData = await getXPData(sub);
    const psv1 = getPSv1Level(xpData.totalXP);
    return reply.send({
      totalXP: xpData.totalXP,
      level: psv1.level,
      levelName: psv1.name,
      xpToNextLevel: psv1.xpToNext,
      history: xpData.history?.slice(-30) ?? [],
    });
  });

  // GET /learning/streak — streak data
  app.get('/streak', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const data = await getStreak(sub);
    return reply.send(data);
  });

  // GET /learning/recommendation — AI đề xuất bài học tiếp theo
  app.get('/recommendation', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = (((req.query as any).subject as Subject) ?? 'general') as Subject;

    try {
      const rec = await getRecommendationsV2(sub, subject);

      if (rec.reviewTopic) {
        return reply.send({
          subject,
          topic: rec.reviewTopic.topic,
          reason: rec.reviewTopic.reason,
          nextAction: rec.nextLesson
            ? `Học bài: ${rec.nextLesson.title}`
            : 'Ôn tập chủ đề này',
        });
      }

      if (rec.nextLesson) {
        return reply.send({
          subject,
          topic: rec.nextLesson.title,
          reason: 'Tiếp tục lộ trình học',
          nextAction: `Học bài: ${rec.nextLesson.title}`,
        });
      }

      if (rec.nextQuiz) {
        return reply.send({
          subject,
          topic: rec.nextQuiz.topic,
          reason: 'Luyện tập kiến thức',
          nextAction: `Làm bài kiểm tra: ${rec.nextQuiz.title}`,
        });
      }

      const state = await getLearningState(sub, subject);
      return reply.send({
        subject,
        topic: state.currentLesson ?? SUBJECT_LABELS[subject] ?? subject,
        reason: 'Tiếp tục hành trình học tập',
        nextAction: state.currentLesson
          ? `Tiếp tục: ${state.currentLesson}`
          : 'Chọn bài học mới để bắt đầu',
      });
    } catch {
      return reply.send({
        subject,
        topic: SUBJECT_LABELS[subject] ?? subject,
        reason: 'Bắt đầu học hôm nay',
        nextAction: 'Chọn một bài học để bắt đầu',
      });
    }
  });

  // GET /learning/mastery — mastery cho tất cả môn
  app.get('/mastery', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const states = await Promise.all(
      SUBJECTS.map(async (subject) => {
        const state = await getLearningState(sub, subject);
        const score = state.progress;
        return {
          subject,
          label: SUBJECT_LABELS[subject],
          score,
          masteryLevel: MASTERY_LABEL(score),
          weakTopics: state.weakTopics,
          strongTopics: state.strongTopics,
        };
      }),
    );

    return reply.send({ subjects: states });
  });

  // POST /learning/mastery/update — cập nhật mastery sau mỗi hoạt động (PSv1 formula)
  app.post('/mastery/update', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      subject: z.enum(['language', 'math', 'viet', 'general']).default('general'),
      topic: z.string().optional(),
      activity: z.enum(['lesson', 'exercise', 'quiz', 'game']).default('exercise'),
      score: z.number().min(0).max(100),
    }).safeParse(req.body);

    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const { subject, topic, activity, score } = body.data;

    const state = await getLearningState(sub, subject);

    // PSv1 mastery formula: activity-type delta, penalty if score < 50
    const baseDelta = MASTERY_DELTA[activity] ?? 3;
    const masteryDelta = score >= 50 ? baseDelta : -2;

    const newProgress = Math.min(100, Math.max(0, (state.progress ?? 0) + masteryDelta));

    const patch: Parameters<typeof updateLearningState>[2] = { progress: newProgress };
    if (topic) {
      if (score < 50 && !state.weakTopics.includes(topic)) {
        patch.weakTopics = [...state.weakTopics.slice(-4), topic];
      } else if (score >= 80 && !state.strongTopics.includes(topic)) {
        patch.strongTopics = [...state.strongTopics.slice(-4), topic];
      }
    }

    const updated = await updateLearningState(sub, subject, patch);

    // Check PSv1 achievements
    await checkAndUnlockAchievements(sub, {
      lessonCount: activity === 'lesson' ? 1 : 0,
      perfectQuiz: activity === 'quiz' && score === 100,
      topMastery: updated.progress / 100,
      subject,
    });

    return reply.send({
      subject,
      oldProgress: state.progress,
      newProgress: updated.progress,
      masteryDelta,
      masteryLevel: MASTERY_LABEL(updated.progress),
      reviewRequired: score < 50,
    });
  });

  // POST /learning/xp — trao XP theo hoạt động (PSv1 XP SYSTEM)
  app.post('/xp', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      activity: z.enum(['lesson', 'exercise', 'quiz', 'game', 'perfect', 'perfect_game', 'streak']),
    }).safeParse(req.body);

    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { sub } = req.user as { sub: string };
    const { activity } = body.data;
    const xp = XP_TABLE[activity] ?? 5;

    const result = await awardXP(sub, activity, xp);

    // Record active day + streak bonus
    const streakData = await recordActiveDay(sub);
    const streakBonus = getStreakBonus(streakData.currentStreak);

    let bonusResult = null;
    if (streakBonus > 0) {
      // Only award streak bonus once per threshold crossing
      const prevStreak = streakData.currentStreak - 1;
      const prevBonus = getStreakBonus(prevStreak);
      if (streakBonus > prevBonus) {
        const br = await awardXP(sub, 'streak_bonus', streakBonus);
        bonusResult = { days: streakData.currentStreak, bonusXP: streakBonus, newTotal: br.newTotal };
      }
    }

    const xpData = await getXPData(sub);
    const psv1 = getPSv1Level(xpData.totalXP);

    return reply.send({
      activity,
      xp,
      ...result,
      level: psv1.level,
      levelName: psv1.name,
      streak: streakData.currentStreak,
      streakBonus: bonusResult,
    });
  });
}
