import type { QuizQ, QuizQTF, QuizQFill, QuizQMatch, AnyQuizQ } from '@/components/chat/types';

function parseTF(block: string, num: number): QuizQTF | null {
  const textMatch = block.match(/\*\*Câu\s+\d+\s*\(Đúng\/Sai\)[:\.]?\*\*\s*([\s\S]+?)(?=\n\*\*Đáp án|$)/i);
  const answerMatch = block.match(/\*\*Đáp án[:\s]*(Đúng|Sai)\*\*/i);
  if (!textMatch || !answerMatch) return null;
  return {
    type: 'tf',
    num,
    text: textMatch[1].trim(),
    answer: answerMatch[1].toLowerCase() === 'đúng',
  };
}

function parseFill(block: string, num: number): QuizQFill | null {
  const textMatch = block.match(/\*\*Câu\s+\d+\s*\(Điền từ\)[:\.]?\*\*\s*([\s\S]+?)(?=\n\*\*Đáp án|$)/i);
  const answerMatch = block.match(/\*\*Đáp án[:\s]*\*\*\s*(.+)/i);
  if (!textMatch || !answerMatch) return null;
  return {
    type: 'fill',
    num,
    text: textMatch[1].trim(),
    answer: answerMatch[1].trim(),
  };
}

function parseMatch(block: string, num: number): QuizQMatch | null {
  const titleMatch = block.match(/\*\*Câu\s+\d+\s*\(Nối đôi\)[:\.]?\*\*\s*([\s\S]+?)(?=\n1\.|$)/i);
  const colALine = block.match(/(?:^|\n)(1\.[^\n]+)/)?.[1];
  const colBLine = block.match(/(?:^|\n)(A\.[^\n]+)/)?.[1];
  const answerMatch = block.match(/\*\*Đáp án[:\s]*\*\*\s*(.+)/i);
  if (!colALine || !colBLine || !answerMatch) return null;

  const colA: { num: number; text: string }[] = [];
  for (const item of colALine.split('|')) {
    const m = item.trim().match(/^(\d+)\.\s*(.+)/);
    if (m) colA.push({ num: parseInt(m[1]), text: m[2].trim() });
  }

  const colB: { key: string; text: string }[] = [];
  for (const item of colBLine.split('|')) {
    const m = item.trim().match(/^([A-Z])\.\s*(.+)/);
    if (m) colB.push({ key: m[1], text: m[2].trim() });
  }

  if (colA.length === 0 || colB.length === 0) return null;

  const answer: Record<number, string> = {};
  for (const pair of answerMatch[1].split(',')) {
    const m = pair.trim().match(/(\d+)-([A-Z])/);
    if (m) answer[parseInt(m[1])] = m[2];
  }

  return {
    type: 'match',
    num,
    text: titleMatch?.[1]?.trim() ?? '',
    colA,
    colB,
    answer,
  };
}

export function parseQuiz(content: string): AnyQuizQ[] {
  const questions: AnyQuizQ[] = [];
  const blocks = content.split(/(?=\*\*Câu\s+\d+)/);

  for (const block of blocks) {
    const numMatch = block.match(/\*\*Câu\s+(\d+)/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1]);

    if (/\(Đúng\/Sai\)/i.test(block)) {
      const q = parseTF(block, num);
      if (q) questions.push(q);
    } else if (/\(Điền từ\)/i.test(block)) {
      const q = parseFill(block, num);
      if (q) questions.push(q);
    } else if (/\(Nối đôi\)/i.test(block)) {
      const q = parseMatch(block, num);
      if (q) questions.push(q);
    } else {
      // MCQ (existing logic — backward compat)
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
      const q: QuizQ = { type: 'mcq', num, text, options, answer: answerMatch[1].toUpperCase() };
      questions.push(q);
    }
  }
  return questions;
}
