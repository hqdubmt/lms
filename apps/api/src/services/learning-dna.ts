/**
 * Learning DNA — Phase 15
 * Phân tích hành vi học tập để xác định Learning Style:
 *   visual | reading | practice | mixed
 * và điều chỉnh Dynamic Teaching Style của AI.
 */

import { LearningDna } from './mongo';
import type { BrainState } from './conversation-brain';

export type LearningStyle = 'visual' | 'reading' | 'practice' | 'mixed';

export interface DnaProfile {
  userId: string;
  style: LearningStyle;
  preferDetail: boolean;
  preferExamples: boolean;
  preferExercises: boolean;
  avgSessionMinutes: number;
  topSubject: string;
  interactionCount: number;
}

const DEFAULT_PROFILE: Omit<DnaProfile, 'userId'> = {
  style: 'mixed',
  preferDetail: false,
  preferExamples: true,
  preferExercises: false,
  avgSessionMinutes: 0,
  topSubject: '',
  interactionCount: 0,
};

export async function getDnaProfile(userId: string): Promise<DnaProfile> {
  const doc = await LearningDna.findOne({ userId }).lean();
  if (!doc) return { userId, ...DEFAULT_PROFILE };
  return {
    userId,
    style: (doc as any).style ?? 'mixed',
    preferDetail: (doc as any).preferDetail ?? false,
    preferExamples: (doc as any).preferExamples ?? true,
    preferExercises: (doc as any).preferExercises ?? false,
    avgSessionMinutes: (doc as any).avgSessionMinutes ?? 0,
    topSubject: (doc as any).topSubject ?? '',
    interactionCount: (doc as any).interactionCount ?? 0,
  };
}

function inferStyle(brain: BrainState, existing: DnaProfile): LearningStyle {
  const modes = (brain as any).recentModes as string[] | undefined ?? [];
  const exerciseCount = modes.filter(m => m === 'exercise' || m === 'quiz').length;
  const tutorCount    = modes.filter(m => m === 'tutor').length;
  const msgCount      = brain.messageCount;

  // Favor exercises → practice learner
  if (exerciseCount > tutorCount && exerciseCount >= 3) return 'practice';
  // Long sessions with many messages → reading/detail learner
  if (msgCount >= 10 && tutorCount > exerciseCount) return 'reading';
  // Mixed if no clear signal
  if (existing.interactionCount < 5) return 'mixed';
  return existing.style;
}

export async function updateDna(
  userId: string,
  brain: BrainState,
  subject: string,
  sessionMinutes: number,
): Promise<DnaProfile> {
  const existing = await getDnaProfile(userId);
  const style = inferStyle(brain, existing);

  const masteryValues = Object.values(brain.mastery as Record<string, number>);
  const avgMastery = masteryValues.length
    ? masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length
    : 0;

  const patch = {
    style,
    preferDetail:    brain.level === 'basic' || avgMastery < 0.4,
    preferExamples:  brain.mistakes.length > 2 || avgMastery < 0.5,
    preferExercises: brain.messageCount > 0 && brain.messageCount % 3 === 0,
    topSubject:      subject || existing.topSubject,
    interactionCount: existing.interactionCount + 1,
    avgSessionMinutes: existing.interactionCount === 0
      ? sessionMinutes
      : Math.round((existing.avgSessionMinutes * 0.8) + sessionMinutes * 0.2),
    updatedAt: new Date(),
  };

  await LearningDna.findOneAndUpdate(
    { userId },
    { $set: patch },
    { upsert: true, new: true },
  );

  return { ...DEFAULT_PROFILE, ...existing, ...patch, userId };
}

/**
 * Build a teaching style hint for the system prompt based on DNA profile.
 */
export function buildDnaHint(profile: DnaProfile): string {
  const STYLE_INSTRUCTIONS: Record<LearningStyle, string> = {
    visual:   'Học sinh học tốt qua hình ảnh — dùng sơ đồ văn bản (ASCII), bảng so sánh, danh sách có thứ tự trực quan.',
    reading:  'Học sinh thích đọc hiểu — giải thích đầy đủ, có tiêu đề, dùng định nghĩa rõ ràng.',
    practice: 'Học sinh học qua thực hành — ưu tiên bài tập, ví dụ cụ thể, ít lý thuyết dài.',
    mixed:    'Học sinh có phong cách học kết hợp — cân bằng giải thích và ví dụ thực tế.',
  };

  const parts: string[] = [`[Learning DNA] ${STYLE_INSTRUCTIONS[profile.style]}`];

  if (profile.preferDetail)    parts.push('Giải thích chi tiết từng bước.');
  if (profile.preferExamples)  parts.push('Luôn kèm ít nhất 1 ví dụ minh hoạ.');
  if (profile.preferExercises) parts.push('Kết thúc phản hồi bằng 1 bài tập nhỏ để luyện tập.');

  return parts.join(' ');
}
