/**
 * Phase 8: Full Learning Platform
 * Routes: AI Teacher, AI Mentor, AI Career Advisor
 * Không sửa bất kỳ route/service hiện có.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { getBrain } from '../../services/conversation-brain';
import { getLearningAnalytics } from '../../services/learning-analytics';
import { getXPData } from '../../services/xp-gamification';
import { getStreak } from '../../services/streak';
import { analyzeKnowledgeGap } from '../../services/knowledge-gap';
import { aiChatOnce } from '../../services/ai-provider';

const SUBJECT_LABEL: Record<string, string> = {
  math: 'Toán học', language: 'Tiếng Anh', viet: 'Tiếng Việt', general: 'Tổng hợp',
};

// ─── AI Teacher Session ───────────────────────────────────────────────────────

export async function platformRoutes(app: FastifyInstance) {

  // GET /ai/teacher-session?subject=&topic=
  app.get('/teacher-session', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const q = req.query as { subject?: string; topic?: string };
    const subject = q.subject || 'general';
    const subjectLabel = SUBJECT_LABEL[subject] ?? subject;

    const [brain, gap] = await Promise.all([
      getBrain(sub, subject),
      analyzeKnowledgeGap(sub, subject),
    ]);

    const topic = q.topic || brain.topic || (gap.weak[0] ?? `${subjectLabel} cơ bản`);

    const prompt = `Bạn là giáo viên ${subjectLabel} chuyên nghiệp. Soạn một buổi dạy ngắn (15-20 phút) về chủ đề: "${topic}".

Trả lời theo JSON (không thêm markdown):
{
  "title": "Tên bài học",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"],
  "sections": [
    {"type": "intro", "title": "Giới thiệu", "content": "Nội dung ngắn"},
    {"type": "explain", "title": "Giải thích chính", "content": "Nội dung chi tiết"},
    {"type": "example", "title": "Ví dụ minh họa", "content": "Ví dụ cụ thể"},
    {"type": "practice", "title": "Luyện tập", "content": "Bài tập thực hành"}
  ],
  "quiz": [
    {"question": "Câu hỏi ngắn?", "answer": "Đáp án ngắn"}
  ],
  "summary": "Tóm tắt bài học một dòng",
  "estimatedMinutes": 15
}`;

    let session: object;
    try {
      const raw = await aiChatOnce([
        { role: 'user', content: prompt },
      ]);
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      session = JSON.parse(cleaned);
    } catch {
      session = {
        title: `Bài học: ${topic}`,
        objectives: [`Hiểu khái niệm về ${topic}`, `Áp dụng vào bài tập`, `Ôn tập và kiểm tra`],
        sections: [
          { type: 'intro', title: 'Giới thiệu', content: `Hôm nay chúng ta học về ${topic}` },
          { type: 'explain', title: 'Nội dung chính', content: `${topic} là kiến thức quan trọng trong ${subjectLabel}` },
          { type: 'practice', title: 'Luyện tập', content: `Hãy thử áp dụng kiến thức về ${topic}` },
        ],
        quiz: [{ question: `${topic} là gì?`, answer: `Đây là khái niệm trong ${subjectLabel}` }],
        summary: `Bài học về ${topic} trong ${subjectLabel}`,
        estimatedMinutes: 15,
      };
    }

    return reply.send({ subject, topic, session, weakTopics: gap.weak.slice(0, 3) });
  });

  // ─── AI Mentor ────────────────────────────────────────────────────────────────

  // GET /ai/mentor
  app.get('/mentor', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };

    const [la, xp, streak, brainGeneral] = await Promise.all([
      getLearningAnalytics(sub),
      getXPData(sub),
      getStreak(sub),
      getBrain(sub, 'general'),
    ]);

    const totalActivity = la.chatCount + la.quizCount + la.homeworkCount;

    // Build motivational message based on data
    let motivation = '';
    if (streak.currentStreak >= 7) {
      motivation = `Tuyệt vời! Bạn đã học liên tiếp ${streak.currentStreak} ngày. Hãy tiếp tục duy trì!`;
    } else if (streak.currentStreak >= 3) {
      motivation = `Bạn đang có chuỗi ${streak.currentStreak} ngày học tập. Chỉ cần thêm vài ngày nữa để đạt thành tích mới!`;
    } else if (totalActivity === 0) {
      motivation = 'Mỗi hành trình bắt đầu bằng một bước. Hôm nay hãy bắt đầu với 10 phút học thôi!';
    } else {
      motivation = `Bạn đã có ${totalActivity} lượt học tập. Hãy đặt mục tiêu hôm nay và chinh phục nó!`;
    }

    // Milestone tracking
    const milestones = [
      { label: '10 lượt chat AI', target: 10, current: la.chatCount, done: la.chatCount >= 10 },
      { label: '5 bài quiz',       target: 5,  current: la.quizCount, done: la.quizCount >= 5 },
      { label: '7 ngày học liên tiếp', target: 7, current: streak.currentStreak, done: streak.currentStreak >= 7 },
      { label: 'Level 5',           target: 5,  current: xp.level, done: xp.level >= 5 },
      { label: '100 phút học',      target: 100, current: la.studyMinutes, done: la.studyMinutes >= 100 },
    ];

    const nextMilestone = milestones.find(m => !m.done);

    // Weekly goal suggestion
    const masteryValues = Object.values(brainGeneral.mastery as Record<string, number>);
    const avgMastery = masteryValues.length
      ? Math.round(masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length * 100)
      : 0;

    const weeklyGoal = avgMastery < 40
      ? 'Ôn tập kiến thức cơ bản — đặt mục tiêu 30 phút mỗi ngày'
      : avgMastery < 70
      ? 'Luyện tập nâng cao — thử làm 3 bài quiz mỗi ngày'
      : 'Thách thức bản thân với nội dung nâng cao';

    return reply.send({
      motivation,
      milestones,
      nextMilestone,
      weeklyGoal,
      stats: {
        streak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        level: xp.level,
        rank: xp.rank,
        totalXP: xp.totalXP,
        studyMinutes: la.studyMinutes,
        avgMastery,
      },
    });
  });

  // POST /ai/mentor/goal
  app.post('/mentor/goal', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      goal: z.string().min(1).max(200),
      subject: z.string().default('general'),
      targetDays: z.number().int().min(1).max(90).default(7),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    // Store goal in Redis (simple)
    const { redis } = await import('../../services/redis');
    const { sub } = req.user as { sub: string };
    const key = `mentor:goal:${sub}`;
    const goalData = {
      ...body.data,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + body.data.targetDays * 86400000).toISOString(),
    };
    await redis.set(key, JSON.stringify(goalData), 'EX', body.data.targetDays * 86400);
    return reply.send({ ok: true, goal: goalData });
  });

  // GET /ai/mentor/goal
  app.get('/mentor/goal', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const { redis } = await import('../../services/redis');
    const raw = await redis.get(`mentor:goal:${sub}`);
    if (!raw) return reply.send({ goal: null });
    try {
      return reply.send({ goal: JSON.parse(raw) });
    } catch {
      return reply.send({ goal: null });
    }
  });

  // ─── AI Career Advisor ────────────────────────────────────────────────────────

  // GET /ai/career-advisor?subject=
  app.get('/career-advisor', { preHandler: requireAuth }, async (req, reply) => {
    const { sub } = req.user as { sub: string };
    const subject = ((req.query as any).subject as string) || 'general';

    const [brain, gap] = await Promise.all([
      getBrain(sub, subject),
      analyzeKnowledgeGap(sub, subject),
    ]);

    const masteryValues = Object.values(brain.mastery as Record<string, number>);
    const avgMastery = masteryValues.length
      ? Math.round(masteryValues.reduce((s, v) => s + v, 0) / masteryValues.length * 100)
      : 0;

    const CAREER_MAP: Record<string, Array<{ title: string; description: string; skills: string[]; roadmap: string[] }>> = {
      math: [
        { title: 'Kỹ sư phần mềm', description: 'Phát triển ứng dụng và hệ thống', skills: ['Giải thuật', 'Cấu trúc dữ liệu', 'Logic'], roadmap: ['Toán rời rạc', 'Lập trình', 'Thuật toán', 'Dự án thực tế'] },
        { title: 'Nhà khoa học dữ liệu', description: 'Phân tích và mô hình hóa dữ liệu', skills: ['Thống kê', 'Xác suất', 'Đại số tuyến tính'], roadmap: ['Thống kê ứng dụng', 'Python/R', 'Machine Learning', 'Project'] },
        { title: 'Kỹ sư tài chính', description: 'Mô hình hóa rủi ro và định giá', skills: ['Tích phân', 'Xác suất', 'Phân tích số'], roadmap: ['Toán tài chính', 'Lập trình tài chính', 'CFA/FRM'] },
      ],
      language: [
        { title: 'Phiên dịch viên', description: 'Dịch thuật và phiên dịch chuyên nghiệp', skills: ['Ngữ pháp nâng cao', 'Văn phong', 'Thuật ngữ chuyên ngành'], roadmap: ['IELTS/TOEIC 8.0+', 'Thực tập dịch thuật', 'Chứng chỉ ATA'] },
        { title: 'Giáo viên tiếng Anh', description: 'Giảng dạy ngôn ngữ', skills: ['Phát âm', 'Ngữ pháp', 'Kỹ năng sư phạm'], roadmap: ['TESOL/CELTA', 'Thực hành giảng dạy', 'Chứng chỉ quốc tế'] },
        { title: 'Content Creator quốc tế', description: 'Tạo nội dung đa ngôn ngữ', skills: ['Viết lách', 'SEO', 'Sáng tạo'], roadmap: ['Kỹ năng viết', 'Marketing số', 'Portfolio'] },
      ],
      viet: [
        { title: 'Nhà báo / Biên tập viên', description: 'Viết và biên tập nội dung', skills: ['Văn phong', 'Nghiên cứu', 'Phân tích'], roadmap: ['Báo chí học', 'Thực tập tòa soạn', 'Portfolio'] },
        { title: 'Giáo viên Ngữ văn', description: 'Giảng dạy văn học và ngôn ngữ', skills: ['Phân tích văn bản', 'Sư phạm', 'Sáng tác'], roadmap: ['Sư phạm Ngữ văn', 'Thực tập giảng dạy', 'Chứng chỉ'] },
        { title: 'Copywriter', description: 'Viết nội dung marketing', skills: ['Ngôn từ sắc sảo', 'Tâm lý khách hàng', 'Sáng tạo'], roadmap: ['Marketing cơ bản', 'Kỹ năng viết quảng cáo', 'Portfolio thực tế'] },
      ],
      general: [
        { title: 'Quản lý dự án', description: 'Điều phối và quản lý nhóm', skills: ['Kỹ năng mềm', 'Tổ chức', 'Giao tiếp'], roadmap: ['PMP/Agile', 'Kinh nghiệm thực tế', 'Chứng chỉ PM'] },
        { title: 'Chuyên viên phân tích', description: 'Phân tích dữ liệu và xu hướng', skills: ['Tư duy phân tích', 'Excel/SQL', 'Báo cáo'], roadmap: ['Thống kê cơ bản', 'Công cụ BI', 'Dự án phân tích'] },
        { title: 'Doanh nhân / Startup', description: 'Xây dựng và phát triển doanh nghiệp', skills: ['Sáng tạo', 'Kiên trì', 'Đa năng'], roadmap: ['Kiến thức kinh doanh', 'Mạng lưới quan hệ', 'MVP đầu tiên'] },
      ],
    };

    const careers = (CAREER_MAP[subject] ?? CAREER_MAP.general).map(c => ({
      ...c,
      matchScore: Math.min(100, avgMastery + Math.floor(Math.random() * 20)),
    })).sort((a, b) => b.matchScore - a.matchScore);

    return reply.send({
      subject,
      subjectLabel: SUBJECT_LABEL[subject] ?? subject,
      avgMastery,
      strongTopics: gap.strong.slice(0, 4),
      careers,
    });
  });
}
