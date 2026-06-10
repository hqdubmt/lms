/**
 * Learning DNA — V1 (bna.md)
 *
 * Lưu tối thiểu:
 *   favoriteSubject — môn học nhiều nhất
 *   weakTopics      — chủ đề điểm thấp
 *   strongTopics    — chủ đề điểm cao
 *   learningSpeed   — dựa vào độ chính xác quiz
 *
 * Điểm topic:
 *   lesson hoàn thành → +1
 *   quiz đúng         → +2
 *   quiz sai          → -1
 */

import { LearningDna } from './mongo';
import type { BrainState } from './conversation-brain';

// ─── V1 Types ─────────────────────────────────────────────────────────────────

export type FavoriteSubject = 'language' | 'math' | 'viet' | '';
export type LearningSpeed   = 'slow' | 'normal' | 'fast';

export interface DnaV1 {
  favoriteSubject: FavoriteSubject;
  weakTopics:      string[];
  strongTopics:    string[];
  learningSpeed:   LearningSpeed;
}

export type TopicEvent = 'lesson' | 'quiz_correct' | 'quiz_wrong';

const WEAK_THRESHOLD     = 0;   // score <= này → yếu (cần đủ MIN_INTERACTIONS)
const STRONG_THRESHOLD   = 5;   // score >= này → mạnh
const MIN_INTERACTIONS   = 2;   // tối thiểu trước khi phân loại
const MAX_TOPICS_DISPLAY = 5;

// ─── V1 Read ──────────────────────────────────────────────────────────────────

export async function getDnaV1(userId: string): Promise<DnaV1> {
  const doc = await LearningDna.findOne({ userId }).lean() as any;
  if (!doc) return { favoriteSubject: '', weakTopics: [], strongTopics: [], learningSpeed: 'normal' };

  const topicScores: Array<{ topic: string; score: number; interactions: number }> = doc.topicScores ?? [];

  // Favorite subject — subject có nhiều tương tác nhất
  const counts = { language: doc.langCount ?? 0, math: doc.mathCount ?? 0, viet: doc.vietCount ?? 0 };
  const maxCount = Math.max(...Object.values(counts));
  let favoriteSubject: FavoriteSubject = '';
  if (maxCount > 0) {
    const entry = (Object.entries(counts) as [FavoriteSubject, number][]).find(([, v]) => v === maxCount);
    if (entry) favoriteSubject = entry[0];
  }

  // Weak/Strong topics
  const weakTopics = topicScores
    .filter(t => t.interactions >= MIN_INTERACTIONS && t.score <= WEAK_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_TOPICS_DISPLAY)
    .map(t => t.topic);

  const strongTopics = topicScores
    .filter(t => t.interactions >= MIN_INTERACTIONS && t.score >= STRONG_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOPICS_DISPLAY)
    .map(t => t.topic);

  // Learning speed — từ độ chính xác quiz
  const quizTotal   = doc.quizTotal   ?? 0;
  const quizCorrect = doc.quizCorrect ?? 0;
  let learningSpeed: LearningSpeed = 'normal';
  if (quizTotal >= 5) {
    const acc = quizCorrect / quizTotal;
    if (acc >= 0.75) learningSpeed = 'fast';
    else if (acc <= 0.40) learningSpeed = 'slow';
  }

  return { favoriteSubject, weakTopics, strongTopics, learningSpeed };
}

// ─── V1 Write ─────────────────────────────────────────────────────────────────

export async function recordTopicEvent(
  userId: string,
  subject: string,
  topic: string,
  event: TopicEvent,
): Promise<void> {
  if (!topic) return;
  const delta = event === 'lesson' ? 1 : event === 'quiz_correct' ? 2 : -1;

  const subjectField = subject === 'language' ? 'langCount'
    : subject === 'math'     ? 'mathCount'
    : subject === 'viet'     ? 'vietCount'
    : null;

  const inc: Record<string, number> = {};
  if (subjectField) inc[subjectField] = 1;
  if (event === 'quiz_correct') { inc['quizTotal'] = 1; inc['quizCorrect'] = 1; }
  if (event === 'quiz_wrong')   { inc['quizTotal'] = 1; }

  const doc = await LearningDna.findOne({ userId }).lean() as any;
  const existing = (doc?.topicScores ?? []).find(
    (t: any) => t.topic === topic && t.subject === subject,
  );

  if (existing) {
    await LearningDna.findOneAndUpdate(
      { userId, 'topicScores.topic': topic, 'topicScores.subject': subject },
      {
        $inc: { 'topicScores.$.score': delta, 'topicScores.$.interactions': 1, ...inc },
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  } else {
    await LearningDna.findOneAndUpdate(
      { userId },
      {
        $push: { topicScores: { topic, subject, score: delta, interactions: 1 } },
        $inc: inc,
        $set: { updatedAt: new Date() },
      },
      { upsert: true },
    );
  }
}

// ─── V1 Hint for system prompt ────────────────────────────────────────────────

export function buildDnaV1Hint(dna: DnaV1): string {
  if (!dna.favoriteSubject && !dna.weakTopics.length && !dna.strongTopics.length) return '';

  const parts: string[] = [];
  if (dna.favoriteSubject) {
    const name = { language: 'Ngoại ngữ', math: 'Toán', viet: 'Tiếng Việt' }[dna.favoriteSubject];
    parts.push(`Môn yêu thích: ${name}.`);
  }
  if (dna.weakTopics.length > 0) {
    parts.push(`Chủ đề yếu: ${dna.weakTopics.slice(0, 3).join(', ')} — giải thích kỹ hơn các chủ đề này.`);
  }
  if (dna.strongTopics.length > 0) {
    parts.push(`Chủ đề mạnh: ${dna.strongTopics.slice(0, 3).join(', ')} — không cần giải thích lại từ đầu.`);
  }
  const speedMap: Record<LearningSpeed, string> = {
    slow:   'chậm — giải thích từng bước nhỏ, nhiều ví dụ',
    normal: 'bình thường',
    fast:   'nhanh — có thể tiếp cận kiến thức phức tạp hơn',
  };
  parts.push(`Tốc độ học: ${speedMap[dna.learningSpeed]}.`);

  return `[Learning DNA V1] ${parts.join(' ')}`;
}

// ─── Legacy (Phase 15) — giữ lại để không phá code cũ ───────────────────────

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
  if (exerciseCount > tutorCount && exerciseCount >= 3) return 'practice';
  if (msgCount >= 10 && tutorCount > exerciseCount) return 'reading';
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
  await LearningDna.findOneAndUpdate({ userId }, { $set: patch }, { upsert: true, new: true });
  return { ...DEFAULT_PROFILE, ...existing, ...patch, userId };
}

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
