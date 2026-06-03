/**
 * Report Generator — bổ sung độc lập, không sửa dashboard
 * Feature flag: ENABLE_REPORTS=true
 * Xuất: Markdown + HTML (có thể in thành PDF)
 */

import { getBrain } from './conversation-brain';
import { getLearningState } from './learning-state';
import { analyzeKnowledgeGap } from './knowledge-gap';
import { getLearningAnalytics } from './learning-analytics';
import { getStreak } from './streak';
import { prisma } from './prisma';

const ENABLED = process.env.ENABLE_REPORTS !== 'false';

export interface ReportData {
  userId: string;
  subject: string;
  generatedAt: string;
  studentName?: string;
  quizStats:      { count: number; avgScore: number; topics: string[] };
  homeworkStats:  { count: number; avgScore: number };
  masteryMap:     Record<string, number>;
  avgMastery:     number;
  strengths:      string[];
  weaknesses:     string[];
  streak:         { current: number; best: number };
  studyMinutes:   number;
  chatCount:      number;
}

export async function buildReportData(
  userId: string,
  subject: string,
): Promise<ReportData | null> {
  if (!ENABLED) return null;

  const [brain, state, gap, analytics, streak] = await Promise.all([
    getBrain(userId, subject),
    getLearningState(userId, subject),
    analyzeKnowledgeGap(userId, subject),
    getLearningAnalytics(userId),
    getStreak(userId),
  ]);

  // Quiz stats from Prisma
  let quizStats = { count: 0, avgScore: 0, topics: [] as string[] };
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { quizSet: { select: { topic: true } } },
    });
    if (attempts.length > 0) {
      quizStats.count = attempts.length;
      quizStats.avgScore = Math.round(
        attempts.reduce((s, a) => s + a.score, 0) / attempts.length,
      );
      quizStats.topics = [...new Set(attempts.map(a => a.quizSet.topic).filter(Boolean) as string[])].slice(0, 5);
    }
  } catch { /* ignore */ }

  const masteryEntries = Object.entries(brain.mastery);
  const avgMastery = masteryEntries.length > 0
    ? Math.round(masteryEntries.reduce((s, [, v]) => s + v, 0) / masteryEntries.length * 100)
    : 0;

  let studentName: string | undefined;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    studentName = user?.name ?? undefined;
  } catch { /* ignore */ }

  return {
    userId,
    subject,
    generatedAt: new Date().toISOString(),
    studentName,
    quizStats,
    homeworkStats: { count: analytics.homeworkCount, avgScore: 0 },
    masteryMap: brain.mastery,
    avgMastery,
    strengths: gap.strong,
    weaknesses: gap.weak,
    streak: { current: streak.currentStreak, best: streak.bestStreak },
    studyMinutes: analytics.studyMinutes,
    chatCount: analytics.chatCount,
  };
}

export function generateMarkdownReport(data: ReportData): string {
  const subjectLabel: Record<string, string> = {
    math: 'Toán', language: 'Ngoại ngữ', viet: 'Tiếng Việt', general: 'Tổng hợp',
  };
  const label = subjectLabel[data.subject] ?? data.subject;
  const name = data.studentName ?? `Học sinh (${data.userId.slice(0, 8)})`;
  const date = new Date(data.generatedAt).toLocaleDateString('vi-VN');

  const masteryLines = Object.entries(data.masteryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([topic, val]) => `| ${topic} | ${Math.round(val * 100)}% |`)
    .join('\n');

  return `# Báo cáo học tập — ${label}
**Học sinh:** ${name}
**Ngày:** ${date}

---

## Tổng quan

| Chỉ số | Giá trị |
|--------|---------|
| Độ thành thạo trung bình | ${data.avgMastery}% |
| Số quiz đã làm | ${data.quizStats.count} |
| Điểm quiz trung bình | ${data.quizStats.avgScore}/100 |
| Số bài tập đã nộp | ${data.homeworkStats.count} |
| Thời gian học | ${data.studyMinutes} phút |
| Streak hiện tại | ${data.streak.current} ngày |
| Streak tốt nhất | ${data.streak.best} ngày |
| Số lần hỏi AI | ${data.chatCount} lần |

---

## Thành thạo theo chủ đề

| Chủ đề | Thành thạo |
|--------|-----------|
${masteryLines || '| — | — |'}

---

## Điểm mạnh

${data.strengths.length > 0 ? data.strengths.map(s => `- ✅ ${s}`).join('\n') : '- Chưa có dữ liệu'}

## Điểm cần cải thiện

${data.weaknesses.length > 0 ? data.weaknesses.map(w => `- ⚠️ ${w}`).join('\n') : '- Không có điểm yếu rõ ràng'}

---

*Báo cáo được tạo tự động bởi AI Tutor*
`;
}

export function generateHtmlReport(data: ReportData): string {
  const md = generateMarkdownReport(data);
  const subjectLabel: Record<string, string> = {
    math: 'Toán', language: 'Ngoại ngữ', viet: 'Tiếng Việt', general: 'Tổng hợp',
  };
  const label = subjectLabel[data.subject] ?? data.subject;
  const name = data.studentName ?? `Học sinh`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Báo cáo học tập — ${label} — ${name}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a2e; }
  h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
  h2 { color: #7c3aed; margin-top: 30px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
  th { background: #f1f5f9; font-weight: 600; }
  tr:nth-child(even) { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.85em; }
  .strong { background: #dcfce7; color: #15803d; }
  .weak { background: #fef9c3; color: #854d0e; }
  footer { margin-top: 40px; font-size: 0.8em; color: #94a3b8; text-align: center; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
<h1>Báo cáo học tập — ${label}</h1>
<p><strong>Học sinh:</strong> ${name} &nbsp;|&nbsp; <strong>Ngày:</strong> ${new Date(data.generatedAt).toLocaleDateString('vi-VN')}</p>

<h2>Tổng quan</h2>
<table>
<tr><th>Chỉ số</th><th>Giá trị</th></tr>
<tr><td>Độ thành thạo trung bình</td><td><strong>${data.avgMastery}%</strong></td></tr>
<tr><td>Số quiz đã làm</td><td>${data.quizStats.count}</td></tr>
<tr><td>Điểm quiz trung bình</td><td>${data.quizStats.avgScore}/100</td></tr>
<tr><td>Số bài tập đã nộp</td><td>${data.homeworkStats.count}</td></tr>
<tr><td>Thời gian học</td><td>${data.studyMinutes} phút</td></tr>
<tr><td>Streak hiện tại / tốt nhất</td><td>${data.streak.current} / ${data.streak.best} ngày</td></tr>
<tr><td>Số lần hỏi AI</td><td>${data.chatCount} lần</td></tr>
</table>

<h2>Thành thạo theo chủ đề</h2>
<table>
<tr><th>Chủ đề</th><th>Thành thạo</th></tr>
${Object.entries(data.masteryMap).sort(([, a], [, b]) => b - a).slice(0, 8)
  .map(([t, v]) => `<tr><td>${t}</td><td>${Math.round(v * 100)}%</td></tr>`).join('')
  || '<tr><td colspan="2">Chưa có dữ liệu</td></tr>'}
</table>

<h2>Điểm mạnh</h2>
<p>${data.strengths.length > 0 ? data.strengths.map(s => `<span class="badge strong">✅ ${s}</span>`).join(' ') : 'Chưa có dữ liệu'}</p>

<h2>Điểm cần cải thiện</h2>
<p>${data.weaknesses.length > 0 ? data.weaknesses.map(w => `<span class="badge weak">⚠️ ${w}</span>`).join(' ') : 'Không có điểm yếu rõ ràng'}</p>

<footer>Báo cáo được tạo tự động bởi AI Tutor • ${new Date(data.generatedAt).toLocaleString('vi-VN')}</footer>
</body>
</html>`;
}
