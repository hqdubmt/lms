import { getBrain } from './conversation-brain';
import { prisma } from './prisma';

export interface KnowledgeGap {
  weak: string[];
  strong: string[];
}

export async function analyzeKnowledgeGap(userId: string, subject: string): Promise<KnowledgeGap> {
  const brain = await getBrain(userId, subject);

  const weak: string[] = brain.mistakes
    .filter(m => m.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(m => m.type.slice(0, 40));

  const strong: string[] = Object.entries(brain.mastery)
    .filter(([, v]) => v >= 0.7)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  try {
    const recentAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { quizSet: { select: { topic: true } } },
    });

    for (const attempt of recentAttempts) {
      const topic = attempt.quizSet.topic;
      if (!topic) continue;
      if (attempt.score < 60 && !weak.includes(topic)) weak.push(topic);
      else if (attempt.score >= 80 && !strong.includes(topic)) strong.push(topic);
    }
  } catch { /* quiz không khả dụng */ }

  return { weak: weak.slice(0, 5), strong: strong.slice(0, 5) };
}
