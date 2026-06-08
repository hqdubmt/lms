/**
 * Module 4 — AI Course Generator
 * Input: topic, level, audience, duration, language
 * Output: Course + Sections + Lessons (TEXT) + Quizzes saved to DB
 */

import { aiChatOnce } from './ai-provider';
import { prisma } from './prisma';

interface CourseGenInput {
  topic: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  targetAudience: string;
  durationWeeks: number;
  language: 'vi' | 'en';
  instructorId: string;
}

interface GenLesson {
  title: string;
  order: number;
  description: string;
  textContent: string;
  quizzes: Array<{ question: string; options: string[]; answer: number; explanation: string }>;
  flashcards: Array<{ front: string; back: string }>;
}

interface GenChapter {
  title: string;
  order: number;
  lessons: GenLesson[];
}

interface GenCourse {
  title: string;
  description: string;
  objectives: string[];
  requirements: string[];
  chapters: GenChapter[];
}

function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);
}

export async function generateCourse(input: CourseGenInput) {
  const langLabel = input.language === 'en' ? 'English' : 'Tiếng Việt';
  const levelLabel = { BEGINNER: 'cơ bản', INTERMEDIATE: 'trung cấp', ADVANCED: 'nâng cao' }[input.level];
  const numChapters = Math.max(3, Math.min(input.durationWeeks, 8));

  const prompt = `Tạo khóa học ${langLabel} về "${input.topic}" cho ${input.targetAudience}, trình độ ${levelLabel}, thời lượng ${input.durationWeeks} tuần (${numChapters} chương).

Trả về JSON (KHÔNG có markdown, KHÔNG giải thích):
{
  "title": "Tên khóa học",
  "description": "Mô tả 2-3 câu hấp dẫn",
  "objectives": ["Sau khóa học bạn sẽ...", "Nắm vững...", "Áp dụng được..."],
  "requirements": ["Yêu cầu tiên quyết 1", "Yêu cầu 2"],
  "chapters": [
    {
      "title": "Chương 1: Tên chương",
      "order": 1,
      "lessons": [
        {
          "title": "Bài 1.1: Tên bài",
          "order": 1,
          "description": "Mô tả ngắn 1 câu",
          "textContent": "Nội dung bài học đầy đủ (300-500 từ, có tiêu đề ##, ví dụ minh họa)",
          "quizzes": [
            { "question": "Câu hỏi trắc nghiệm?", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": 0, "explanation": "Giải thích ngắn" }
          ],
          "flashcards": [
            { "front": "Khái niệm / Từ khóa", "back": "Định nghĩa / Giải thích" }
          ]
        }
      ]
    }
  ]
}

Tạo đủ ${numChapters} chương, mỗi chương 2-3 bài, mỗi bài có 2 quizzes và 2 flashcards.`;

  const raw = await aiChatOnce([{ role: 'user', content: prompt }], { prefer: 'gemini' });
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();

  let generated: GenCourse;
  try {
    generated = JSON.parse(cleaned);
  } catch {
    throw new Error('AI trả về dữ liệu không hợp lệ, vui lòng thử lại');
  }

  const baseSlug = makeSlug(generated.title);
  const slug = `${baseSlug}-${Date.now()}`;

  const course = await prisma.course.create({
    data: {
      title: generated.title,
      slug,
      description: generated.description,
      level: input.level,
      language: input.language,
      instructorId: input.instructorId,
      objectives: generated.objectives ?? [],
      requirements: generated.requirements ?? [],
      status: 'DRAFT',
      tags: [input.topic],
    },
  });

  let totalLessons = 0;

  for (const chapter of generated.chapters) {
    const section = await prisma.section.create({
      data: {
        title: chapter.title,
        order: chapter.order,
        courseId: course.id,
      },
    });

    for (const lesson of chapter.lessons) {
      const lessonSlug = `${makeSlug(lesson.title)}-${section.id.slice(0, 8)}-${lesson.order}`;
      const createdLesson = await prisma.lesson.create({
        data: {
          title: lesson.title,
          slug: lessonSlug,
          description: lesson.description,
          type: 'TEXT',
          order: lesson.order,
          sectionId: section.id,
          textContent: lesson.textContent,
          isPublished: false,
        },
      });
      totalLessons++;

      for (let i = 0; i < (lesson.quizzes?.length ?? 0); i++) {
        const q = lesson.quizzes[i];
        await prisma.quiz.create({
          data: {
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            lessonId: createdLesson.id,
            order: i + 1,
          },
        });
      }
    }
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { totalLessons },
  });

  return {
    courseId: course.id,
    title: course.title,
    slug: course.slug,
    level: course.level,
    chaptersCount: generated.chapters.length,
    lessonsCount: totalLessons,
    flashcardsPerLesson: 2,
  };
}
