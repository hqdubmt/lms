import { redis } from './redis';
import { getBrain } from './conversation-brain';

export interface DayTask {
  day: number;
  date: string;
  focus: string;
  activities: string[];
  type: 'review' | 'practice' | 'quiz' | 'new';
}

export interface StudyPlan {
  days: number;
  subject: string;
  plan: DayTask[];
  weakTopics: string[];
  generatedAt: number;
}

const PLAN_TTL = 6 * 3600;

const ACTIVITIES: Record<DayTask['type'], string[]> = {
  review:   ['Ôn lại kiến thức đã học', 'Giải bài tập ôn tập', 'Kiểm tra lỗi thường gặp'],
  practice: ['Luyện tập chuyên sâu', 'Giải bài tập nâng cao', 'Áp dụng vào bài toán thực tế'],
  quiz:     ['Làm quiz kiểm tra', 'Phân tích kết quả và lỗi sai', 'Ghi chú điểm cần cải thiện'],
  new:      ['Học lý thuyết mới', 'Làm bài tập ứng dụng cơ bản', 'Ghi chú điểm quan trọng'],
};

const DEFAULT_TOPICS: Record<string, string[]> = {
  math:     ['Số học', 'Đại số', 'Hình học', 'Thống kê', 'Giải tích', 'Tổ hợp xác suất'],
  language: ['Grammar', 'Vocabulary', 'Reading', 'Listening', 'Writing', 'Speaking'],
  viet:     ['Từ vựng', 'Ngữ pháp', 'Đọc hiểu', 'Chính tả', 'Văn học', 'Tập làm văn'],
  general:  ['Ôn tập tổng hợp', 'Luyện đề', 'Kiểm tra kiến thức', 'Bài tập thực hành'],
};

export async function generateStudyPlan(
  userId: string,
  subject: string,
  days: 7 | 14 | 30,
): Promise<StudyPlan> {
  const cacheKey = `studyplan:${userId}:${subject}:${days}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  const brain = await getBrain(userId, subject);

  const clean = (s: string) =>
    s.replace(/[^\p{L}\p{N}\s:,()]+/gu, '').trim().slice(0, 40);

  const weakTopics = Object.entries(brain.mastery as Record<string, number>)
    .filter(([, v]) => v < 0.6)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => clean(k))
    .filter(Boolean);

  const mistakeTopics = [...new Set(brain.mistakes.map(m => clean(m.type)))].filter(Boolean);

  const priorityPool = [...new Set([...weakTopics, ...mistakeTopics])];
  const fallback = DEFAULT_TOPICS[subject] ?? DEFAULT_TOPICS.general;
  const topicPool = priorityPool.length >= 3 ? priorityPool : [...priorityPool, ...fallback];

  const today = new Date();
  const plan: DayTask[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    // Every 7th day → quiz day. Otherwise 2 review + 1 practice cycle.
    let type: DayTask['type'];
    if ((i + 1) % 7 === 0) {
      type = 'quiz';
    } else if (i % 3 === 0) {
      type = 'review';
    } else if (i % 3 === 1) {
      type = 'practice';
    } else {
      // On first pass through new topics, mark as 'new'; otherwise 'review'
      type = i < topicPool.length ? 'new' : 'review';
    }

    const focus = topicPool[i % topicPool.length];
    plan.push({ day: i + 1, date: dateStr, focus, activities: ACTIVITIES[type], type });
  }

  const result: StudyPlan = {
    days,
    subject,
    plan,
    weakTopics: priorityPool.slice(0, 5),
    generatedAt: Date.now(),
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', PLAN_TTL).catch(() => {});
  return result;
}
