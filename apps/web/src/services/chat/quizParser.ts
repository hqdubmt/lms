import type { QuizQ } from '@/components/chat/types';

export function parseQuiz(content: string): QuizQ[] {
  const questions: QuizQ[] = [];
  const blocks = content.split(/(?=\*\*Câu\s+\d+)/);

  for (const block of blocks) {
    const numMatch = block.match(/\*\*Câu\s+(\d+)/);
    if (!numMatch) continue;
    const answerMatch = block.match(/\*\*Đáp án[:\s]*([A-D])\*\*/i);
    if (!answerMatch) continue;

    const questionMatch = block.match(/\*\*Câu\s+\d+[:\.]?\*\*\s*([\s\S]+?)(?=\n?[A-D][.:]\s)/);
    if (!questionMatch) continue;
    const text = questionMatch[1].trim();

    const optSection = block.slice(block.search(/[A-D][.:]\s/)).split('**Đáp án')[0];

    const options: { key: string; text: string }[] = [];
    for (const key of ['A', 'B', 'C', 'D']) {
      const re = new RegExp(`\\b${key}[.:]\\s*([\\s\\S]+?)(?=\\s[B-D][.:]\\s|\\n[A-D][.:]\\s|$)`);
      const m = optSection.match(re);
      if (m) options.push({ key, text: m[1].replace(/\n/g, ' ').trim() });
    }

    if (options.length < 2) continue;
    questions.push({ num: parseInt(numMatch[1]), text, options, answer: answerMatch[1].toUpperCase() });
  }
  return questions;
}
