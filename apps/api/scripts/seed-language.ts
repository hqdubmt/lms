/**
 * Script seed dữ liệu mẫu ngoại ngữ — chạy trực tiếp không cần API server.
 *
 * Dùng: npx ts-node scripts/seed-language.ts [email]
 * Mặc định dùng: instructor@lms.com
 */

import { PrismaClient } from '@prisma/client';
import { LANG_GOLD_DATASET } from '../src/data/lang-gold-dataset';

const prisma = new PrismaClient({ log: [] });

// ─── SM-2 helpers (chỉ dùng để build questions) ───────────────────────────────

type VocabItemLike = {
  id: string; word: string; translation: string;
  pronunciation?: string | null; example?: string | null;
  exampleTrans?: string | null; notes?: string | null;
};

const shuffleArr = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

function buildMultipleChoice(pool: VocabItemLike[], count: number) {
  if (pool.length < 4) return { error: 'need 4+' };
  const items = shuffleArr(pool).slice(0, Math.min(count, pool.length));
  return items.map((item, i) => {
    const distractors = shuffleArr(pool.filter(p => p.id !== item.id)).slice(0, 3);
    const options = shuffleArr([item, ...distractors]).map(o => o.translation);
    return {
      content: `"${item.word}" nghĩa là gì?`,
      options: JSON.stringify(options),
      answer: JSON.stringify(item.translation),
      explanation: item.example || null,
      order: i,
      points: 1,
    };
  });
}

function buildFillBlank(pool: VocabItemLike[], count: number) {
  const items = pool.filter(p => p.example).slice(0, count);
  if (items.length < 2) return { error: 'need examples' };
  return items.map((item, i) => {
    const blank = item.example!.replace(new RegExp(`\\b${item.word}\\b`, 'gi'), '___');
    return {
      content: `Điền vào chỗ trống: ${blank}`,
      options: null,
      answer: JSON.stringify(item.word.toLowerCase()),
      explanation: `${item.word} = ${item.translation}`,
      order: i,
      points: 1,
    };
  });
}

function buildMatching(pool: VocabItemLike[], count: number) {
  const items = shuffleArr(pool).slice(0, Math.min(count, 10, pool.length));
  if (items.length < 3) return { error: 'need 3+' };
  const pairs = items.map(item => ({ word: item.word, translation: item.translation }));
  return [{
    content: 'Ghép từ với nghĩa đúng',
    options: JSON.stringify(pairs),
    answer: JSON.stringify(pairs),
    explanation: null,
    order: 0,
    points: pairs.length,
  }];
}

function buildWordOrder(pool: VocabItemLike[], count: number) {
  const items = pool.filter(p => p.example && p.example.split(' ').length >= 4).slice(0, count);
  if (items.length < 2) return { error: 'need examples' };
  return items.map((item, i) => {
    const words = item.example!.split(' ');
    const shuffled = shuffleArr(words);
    return {
      content: `Sắp xếp thành câu đúng: ${shuffled.join(' | ')}`,
      options: JSON.stringify(shuffled),
      answer: JSON.stringify(item.example),
      explanation: item.exampleTrans || null,
      order: i,
      points: 1,
    };
  });
}

function buildQuestions(pool: VocabItemLike[], type: string, count: number): any[] | { error: string } {
  switch (type) {
    case 'MULTIPLE_CHOICE': return buildMultipleChoice(pool, count);
    case 'FILL_BLANK': return buildFillBlank(pool, count);
    case 'MATCHING': return buildMatching(pool, count);
    case 'WORD_ORDER': return buildWordOrder(pool, count);
    default: return { error: 'unknown type' };
  }
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  const targetEmail = process.argv[2] || 'instructor@lms.com';

  const user = await prisma.user.findUnique({ where: { email: targetEmail }, select: { id: true, email: true, role: true } });
  if (!user) {
    console.error(`❌ Không tìm thấy user: ${targetEmail}`);
    process.exit(1);
  }
  console.log(`👤 Seeding cho: ${user.email} (${user.role})`);

  // Xóa data mẫu cũ nếu có
  const oldSets = await prisma.vocabSet.findMany({
    where: { createdBy: user.id, title: { startsWith: '[Mẫu]' } },
    select: { id: true, title: true },
  });
  if (oldSets.length > 0) {
    await prisma.vocabSet.deleteMany({ where: { id: { in: oldSets.map(s => s.id) } } });
    console.log(`🗑️  Đã xóa ${oldSets.length} set cũ`);
  }

  const levels = ['A1', 'A2', 'B1', 'B2'] as const;
  const folderMap: Record<string, string> = {};

  // Tạo folders
  for (const level of levels) {
    const desc = level === 'A1' ? 'Từ cơ bản lớp 1-2' : level === 'A2' ? 'Từ sơ cấp lớp 3-4' : level === 'B1' ? 'Từ trung cấp lớp 5-6' : 'Từ nâng cao B2';
    const folder = await prisma.vocabSet.create({
      data: {
        title: `[Mẫu] Tiếng Anh ${level}`,
        description: `Bộ từ vựng mẫu ${level} — ${desc}`,
        language: 'en', targetLang: 'vi', level,
        isPublic: true, createdBy: user.id,
      },
    });
    folderMap[level] = folder.id;
    console.log(`📁 Folder ${level}: ${folder.id}`);
  }

  const TYPE_LABELS: Record<string, string> = {
    MULTIPLE_CHOICE: 'Trắc nghiệm', FILL_BLANK: 'Điền từ',
    MATCHING: 'Ghép cặp', WORD_ORDER: 'Sắp xếp câu',
  };

  let totalWords = 0;
  let totalExercises = 0;
  let totalSets = 0;

  for (const gset of LANG_GOLD_DATASET) {
    const parentId = folderMap[gset.level];
    if (!parentId) continue;

    const vocabSet = await prisma.vocabSet.create({
      data: {
        title: gset.title,
        description: gset.description,
        language: 'en', targetLang: 'vi',
        level: gset.level, isPublic: true,
        createdBy: user.id, parentId,
      },
    });

    await prisma.vocabItem.createMany({
      data: gset.words.map((w, i) => ({
        setId: vocabSet.id,
        word: w.word,
        translation: w.translation,
        pronunciation: w.pronunciation || undefined,
        example: w.example || undefined,
        exampleTrans: w.exampleTrans || undefined,
        synonyms: w.synonyms || [],
        hints: w.hints || [],
        topic: gset.topic,
        itemLevel: gset.level,
        order: i,
      })),
    });

    totalWords += gset.words.length;
    totalSets++;

    // Tạo bài tập
    if (gset.words.length >= 4) {
      const pool = gset.words.map((w, i) => ({
        id: `tmp-${i}`, word: w.word, translation: w.translation,
        pronunciation: w.pronunciation, example: w.example,
        exampleTrans: w.exampleTrans, notes: null,
      }));

      for (const type of ['MULTIPLE_CHOICE', 'FILL_BLANK', 'MATCHING', 'WORD_ORDER']) {
        const questions = buildQuestions(pool, type, 20);
        if ('error' in questions) continue;

        await prisma.langExercise.create({
          data: {
            title: `[Mẫu] ${gset.title.replace('[Mẫu] ', '')} — ${TYPE_LABELS[type]}`,
            description: `Bài tập ${TYPE_LABELS[type]} tự động — ${gset.level}`,
            type: type as any,
            language: 'en', level: gset.level,
            isPublic: true, createdBy: user.id,
            vocabSetId: vocabSet.id,
            questions: { create: questions },
          },
        });
        totalExercises++;
      }
    }

    process.stdout.write(`  ✓ ${gset.level} ${gset.title.substring(0, 45).padEnd(45)} (${gset.words.length} từ)\n`);
  }

  console.log('\n🎉 Seed hoàn thành!');
  console.log(`   ${totalSets} bộ từ vựng`);
  console.log(`   ${totalWords} từ vựng`);
  console.log(`   ${totalExercises} bài tập`);
  console.log('\n→ Vào /language để xem dữ liệu');
}

main().catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
