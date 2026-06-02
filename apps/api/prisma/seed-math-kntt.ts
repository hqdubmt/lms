/**
 * Seed dữ liệu Toán học lớp 2–5
 * Bộ sách: Kết nối tri thức với cuộc sống (NXB Giáo dục Việt Nam)
 *
 * Chạy: npx tsx prisma/seed-math-kntt.ts
 */

import { PrismaClient, MathSubject, MathExerciseType } from '@prisma/client';

const prisma = new PrismaClient();
const TEXTBOOK = 'Kết nối tri thức với cuộc sống';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getAdminId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Chưa có tài khoản ADMIN. Chạy seed.ts trước.');
  return admin.id;
}

async function upsertTopic(data: {
  title: string;
  description: string;
  subject: MathSubject;
  grade: number;
  level: string;
  lessonType?: string;
  createdBy: string;
}) {
  return prisma.mathTopic.upsert({
    where: { id: `kntt-math-g${data.grade}-${slugify(data.title)}` },
    update: { description: data.description },
    create: {
      id: `kntt-math-g${data.grade}-${slugify(data.title)}`,
      ...data,
      textbook: TEXTBOOK,
      isPublic: true,
    },
  });
}

async function upsertConcept(data: {
  topicId: string;
  name: string;
  definition: string;
  formula?: string;
  example?: string;
  solution?: string;
  hints?: string[];
  order: number;
}) {
  return prisma.mathConcept.upsert({
    where: { id: `kntt-concept-${slugify(data.topicId + data.name)}` },
    update: { definition: data.definition },
    create: {
      id: `kntt-concept-${slugify(data.topicId + data.name)}`,
      ...data,
      hints: data.hints ?? [],
    },
  });
}

async function upsertExercise(data: {
  title: string;
  description?: string;
  type: MathExerciseType;
  subject: MathSubject;
  grade: number;
  level: string;
  timeLimit?: number;
  topicId: string;
  createdBy: string;
  questions: {
    content: string;
    answer: string;
    explanation?: string;
    options?: string[];
    order: number;
  }[];
}) {
  const { questions, ...rest } = data;
  const exId = `kntt-ex-${slugify(data.topicId + data.title)}`;
  const ex = await prisma.mathExercise.upsert({
    where: { id: exId },
    update: {},
    create: {
      id: exId,
      ...rest,
      isPublic: true,
    },
  });
  for (const q of questions) {
    const qId = `kntt-q-${slugify(exId + q.content.slice(0, 30))}`;
    await prisma.mathQuestion.upsert({
      where: { id: qId },
      update: {},
      create: {
        id: qId,
        exerciseId: ex.id,
        content: q.content,
        answer: q.answer as any,        // Json field
        solution: q.explanation,
        options: q.options ? q.options as any : [],
        order: q.order,
      },
    });
  }
  return ex;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 2
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade2(adminId: string) {
  console.log('  📘 Lớp 2...');

  // ── Chương 1: Ôn tập số và phép tính ──────────────────────────────────────
  const t2_1 = await upsertTopic({
    title: 'Ôn tập các số trong phạm vi 100',
    description: 'Đọc, viết, so sánh các số từ 0 đến 100; hàng chục và hàng đơn vị',
    subject: 'ARITHMETIC', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_1.id, name: 'Hàng chục và hàng đơn vị', order: 1,
    definition: 'Số có hai chữ số gồm hàng chục và hàng đơn vị. Ví dụ: 53 = 5 chục + 3 đơn vị.',
    formula: 'Số = (chữ số hàng chục × 10) + chữ số hàng đơn vị',
    example: '47 = 4 × 10 + 7 = 40 + 7', solution: 'Đọc từ trái sang phải: chục trước, đơn vị sau.',
    hints: ['Hàng chục là chữ số đầu tiên (bên trái)', 'Hàng đơn vị là chữ số cuối (bên phải)'] });
  await upsertConcept({ topicId: t2_1.id, name: 'So sánh số có hai chữ số', order: 2,
    definition: 'So sánh hai số có hai chữ số: so hàng chục trước, nếu bằng nhau thì so hàng đơn vị.',
    example: 'So sánh 63 và 68: hàng chục đều là 6, so hàng đơn vị: 3 < 8, vậy 63 < 68.',
    hints: ['So hàng chục trước', 'Nếu hàng chục bằng nhau, so hàng đơn vị'] });

  const t2_2 = await upsertTopic({
    title: 'Phép cộng và phép trừ trong phạm vi 100',
    description: 'Cộng, trừ có nhớ và không nhớ trong phạm vi 100; số hạng, tổng, số bị trừ, số trừ, hiệu',
    subject: 'ARITHMETIC', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_2.id, name: 'Thành phần phép cộng', order: 1,
    definition: 'Trong phép cộng: Số hạng + Số hạng = Tổng.',
    formula: 'a + b = tổng', example: '24 + 35 = 59 (24 và 35 là số hạng, 59 là tổng)',
    hints: ['Số hạng là các số đem cộng', 'Tổng là kết quả của phép cộng'] });
  await upsertConcept({ topicId: t2_2.id, name: 'Thành phần phép trừ', order: 2,
    definition: 'Trong phép trừ: Số bị trừ − Số trừ = Hiệu.',
    formula: 'a − b = hiệu', example: '75 − 32 = 43 (75 là số bị trừ, 32 là số trừ, 43 là hiệu)',
    hints: ['Số bị trừ đứng trước dấu trừ', 'Hiệu là kết quả của phép trừ'] });
  await upsertConcept({ topicId: t2_2.id, name: 'Cộng có nhớ trong phạm vi 100', order: 3,
    definition: 'Khi cộng hàng đơn vị ≥ 10, viết đơn vị, nhớ 1 vào hàng chục.',
    formula: '27 + 35: 7+5=12 viết 2 nhớ 1; 2+3+1=6; kết quả 62',
    example: '48 + 37 = ? (8+7=15, viết 5 nhớ 1; 4+3+1=8; kết quả 85)',
    hints: ['Cộng hàng đơn vị trước', 'Nếu tổng ≥ 10 thì nhớ 1 sang hàng chục'] });
  await upsertExercise({
    title: 'Bài tập phép cộng có nhớ', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 2, level: 'co_ban', timeLimit: 600, topicId: t2_2.id, createdBy: adminId,
    questions: [
      { content: '36 + 47 = ?', answer: '83', explanation: '6+7=13 viết 3 nhớ 1; 3+4+1=8; kết quả 83', order: 1 },
      { content: '58 + 24 = ?', answer: '82', explanation: '8+4=12 viết 2 nhớ 1; 5+2+1=8; kết quả 82', order: 2 },
      { content: '45 + 38 = ?', answer: '83', explanation: '5+8=13 viết 3 nhớ 1; 4+3+1=8; kết quả 83', order: 3 },
      { content: '67 + 25 = ?', answer: '92', explanation: '7+5=12 viết 2 nhớ 1; 6+2+1=9; kết quả 92', order: 4 },
      { content: '19 + 63 = ?', answer: '82', explanation: '9+3=12 viết 2 nhớ 1; 1+6+1=8; kết quả 82', order: 5 },
    ],
  });

  // ── Chương 2: Phép nhân và phép chia ──────────────────────────────────────
  const t2_3 = await upsertTopic({
    title: 'Phép nhân — Bảng nhân 2, 3, 4, 5',
    description: 'Khái niệm phép nhân; bảng nhân 2, 3, 4, 5; thừa số và tích',
    subject: 'ARITHMETIC', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_3.id, name: 'Khái niệm phép nhân', order: 1,
    definition: 'Phép nhân là tổng của nhiều số hạng bằng nhau. a × b = a cộng b lần.',
    formula: 'a × b = a + a + ... + a (b lần)',
    example: '3 × 4 = 3 + 3 + 3 + 3 = 12',
    hints: ['Thừa số là các số đem nhân', 'Tích là kết quả của phép nhân'] });
  await upsertConcept({ topicId: t2_3.id, name: 'Bảng nhân 2', order: 2,
    definition: 'Bảng nhân 2: 2×1=2; 2×2=4; 2×3=6; 2×4=8; 2×5=10; 2×6=12; 2×7=14; 2×8=16; 2×9=18; 2×10=20',
    example: 'Có 4 đôi găng tay, mỗi đôi 2 chiếc. Có tất cả: 2 × 4 = 8 chiếc.',
    hints: ['Nhân 2 là cộng thêm 2 mỗi lần', 'Kết quả luôn là số chẵn'] });
  await upsertConcept({ topicId: t2_3.id, name: 'Bảng nhân 3', order: 3,
    definition: 'Bảng nhân 3: 3×1=3; 3×2=6; 3×3=9; 3×4=12; 3×5=15; 3×6=18; 3×7=21; 3×8=24; 3×9=27; 3×10=30',
    example: 'Mỗi tam giác có 3 cạnh. 5 tam giác có: 3 × 5 = 15 cạnh.',
    hints: ['Nhân 3 là cộng thêm 3 mỗi lần'] });
  await upsertConcept({ topicId: t2_3.id, name: 'Bảng nhân 4', order: 4,
    definition: 'Bảng nhân 4: 4×1=4; 4×2=8; 4×3=12; 4×4=16; 4×5=20; 4×6=24; 4×7=28; 4×8=32; 4×9=36; 4×10=40',
    example: 'Mỗi hình vuông có 4 góc. 6 hình vuông có: 4 × 6 = 24 góc.',
    hints: ['Nhân 4 bằng nhân 2 rồi nhân 2 tiếp'] });
  await upsertConcept({ topicId: t2_3.id, name: 'Bảng nhân 5', order: 5,
    definition: 'Bảng nhân 5: 5×1=5; 5×2=10; 5×3=15; 5×4=20; 5×5=25; 5×6=30; 5×7=35; 5×8=40; 5×9=45; 5×10=50',
    example: 'Mỗi bàn tay có 5 ngón. 2 bàn tay có: 5 × 2 = 10 ngón.',
    hints: ['Kết quả nhân 5 luôn tận cùng bằng 0 hoặc 5'] });
  await upsertExercise({
    title: 'Luyện bảng nhân 2, 3, 4, 5', type: 'MULTIPLE_CHOICE', subject: 'ARITHMETIC',
    grade: 2, level: 'co_ban', timeLimit: 600, topicId: t2_3.id, createdBy: adminId,
    questions: [
      { content: '2 × 6 = ?', answer: '12', options: ['10', '12', '14', '16'], order: 1 },
      { content: '3 × 7 = ?', answer: '21', options: ['18', '21', '24', '27'], order: 2 },
      { content: '4 × 8 = ?', answer: '32', options: ['28', '30', '32', '36'], order: 3 },
      { content: '5 × 9 = ?', answer: '45', options: ['40', '42', '45', '50'], order: 4 },
      { content: 'Có 6 hộp, mỗi hộp có 4 quả cam. Có tất cả bao nhiêu quả cam?', answer: '24', options: ['20', '22', '24', '26'], order: 5 },
    ],
  });

  const t2_4 = await upsertTopic({
    title: 'Phép chia — Bảng chia 2, 3, 4, 5',
    description: 'Khái niệm phép chia; bảng chia 2, 3, 4, 5; số bị chia, số chia, thương; một phần mấy',
    subject: 'ARITHMETIC', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_4.id, name: 'Khái niệm phép chia', order: 1,
    definition: 'Phép chia là phép tính ngược của phép nhân. a ÷ b = c khi c × b = a.',
    formula: 'Số bị chia ÷ Số chia = Thương',
    example: '12 ÷ 3 = 4 (vì 4 × 3 = 12)',
    hints: ['Số bị chia đứng trước dấu ÷', 'Thương là kết quả của phép chia'] });
  await upsertConcept({ topicId: t2_4.id, name: 'Một phần mấy', order: 2,
    definition: 'Chia một số thành các phần bằng nhau, mỗi phần là một phần mấy của số đó.',
    example: 'Chia 8 thành 4 phần bằng nhau, mỗi phần là 1/4 của 8, tức là 8 ÷ 4 = 2.',
    hints: ['1/2 của 10 = 10 ÷ 2 = 5', '1/4 của 12 = 12 ÷ 4 = 3'] });
  await upsertExercise({
    title: 'Luyện bảng chia 2, 3, 4, 5', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 2, level: 'co_ban', timeLimit: 600, topicId: t2_4.id, createdBy: adminId,
    questions: [
      { content: '18 ÷ 2 = ?', answer: '9', explanation: 'Vì 9 × 2 = 18', order: 1 },
      { content: '27 ÷ 3 = ?', answer: '9', explanation: 'Vì 9 × 3 = 27', order: 2 },
      { content: '32 ÷ 4 = ?', answer: '8', explanation: 'Vì 8 × 4 = 32', order: 3 },
      { content: '45 ÷ 5 = ?', answer: '9', explanation: 'Vì 9 × 5 = 45', order: 4 },
      { content: '1/2 của 20 = ?', answer: '10', explanation: '20 ÷ 2 = 10', order: 5 },
    ],
  });

  // ── Chương 3: Các số trong phạm vi 1000 ───────────────────────────────────
  const t2_5 = await upsertTopic({
    title: 'Các số trong phạm vi 1000',
    description: 'Đọc, viết, so sánh các số có ba chữ số; hàng trăm, hàng chục, hàng đơn vị',
    subject: 'NUMBER_THEORY', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_5.id, name: 'Số có ba chữ số', order: 1,
    definition: 'Số có ba chữ số gồm hàng trăm, hàng chục, hàng đơn vị.',
    formula: 'Số = (chữ số hàng trăm × 100) + (hàng chục × 10) + hàng đơn vị',
    example: '357 = 3 trăm + 5 chục + 7 đơn vị = 300 + 50 + 7',
    hints: ['Hàng trăm là chữ số đầu tiên', 'Đọc từ trái sang phải: trăm, chục, đơn vị'] });
  await upsertConcept({ topicId: t2_5.id, name: 'So sánh số có ba chữ số', order: 2,
    definition: 'So sánh từ hàng trăm → hàng chục → hàng đơn vị.',
    example: 'So sánh 472 và 465: hàng trăm đều 4; hàng chục 7 > 6; vậy 472 > 465.',
    hints: ['So từ hàng cao nhất', 'Số nào có hàng trăm lớn hơn thì lớn hơn'] });
  await upsertConcept({ topicId: t2_5.id, name: 'Cộng trừ trong phạm vi 1000', order: 3,
    definition: 'Thực hiện cộng trừ theo cột, thẳng hàng, từ hàng đơn vị đến hàng trăm.',
    example: '325 + 247 = 572; 800 − 364 = 436',
    hints: ['Đặt thẳng cột', 'Cộng/trừ từ phải sang trái', 'Nhớ khi tổng ≥ 10'] });
  await upsertExercise({
    title: 'Bài tập số có ba chữ số', type: 'MULTIPLE_CHOICE', subject: 'NUMBER_THEORY',
    grade: 2, level: 'co_ban', timeLimit: 600, topicId: t2_5.id, createdBy: adminId,
    questions: [
      { content: '435 + 248 = ?', answer: '683', options: ['673', '683', '693', '703'], order: 1 },
      { content: '700 − 325 = ?', answer: '375', options: ['365', '375', '385', '425'], order: 2 },
      { content: 'Số nào lớn nhất trong các số: 523, 532, 325, 352?', answer: '532', options: ['523', '532', '325', '352'], order: 3 },
      { content: '600 + 80 + 7 = ?', answer: '687', options: ['687', '678', '876', '608'], order: 4 },
    ],
  });

  // ── Chương 4: Hình học và đo lường ────────────────────────────────────────
  const t2_6 = await upsertTopic({
    title: 'Hình học lớp 2 — Đường thẳng, đường gấp khúc, chu vi',
    description: 'Điểm, đường thẳng, ba điểm thẳng hàng; đường gấp khúc; chu vi hình tam giác và tứ giác',
    subject: 'GEOMETRY', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_6.id, name: 'Đường thẳng và ba điểm thẳng hàng', order: 1,
    definition: 'Đường thẳng là đường thẳng không cong, kéo dài vô tận về hai phía. Ba điểm thẳng hàng là ba điểm cùng nằm trên một đường thẳng.',
    example: 'A, B, C thẳng hàng khi A, B, C cùng nằm trên đường thẳng d.',
    hints: ['Dùng thước để kiểm tra ba điểm có thẳng hàng không'] });
  await upsertConcept({ topicId: t2_6.id, name: 'Đường gấp khúc và độ dài đường gấp khúc', order: 2,
    definition: 'Đường gấp khúc gồm nhiều đoạn thẳng nối tiếp nhau. Độ dài đường gấp khúc = tổng độ dài các đoạn thẳng.',
    formula: 'Độ dài = đoạn 1 + đoạn 2 + ... + đoạn n',
    example: 'Đường gấp khúc ABCD có AB=3cm, BC=4cm, CD=2cm → dài 3+4+2=9cm',
    hints: ['Cộng tất cả các đoạn thẳng lại'] });
  await upsertConcept({ topicId: t2_6.id, name: 'Chu vi hình tam giác và tứ giác', order: 3,
    definition: 'Chu vi là tổng độ dài các cạnh của hình.',
    formula: 'Chu vi tam giác = a + b + c; Chu vi tứ giác = a + b + c + d',
    example: 'Tam giác có 3 cạnh 5cm, 4cm, 3cm → chu vi = 5+4+3 = 12cm',
    hints: ['Chu vi = cộng tất cả các cạnh'] });

  const t2_7 = await upsertTopic({
    title: 'Đo lường lớp 2 — Độ dài, khối lượng, dung tích, thời gian',
    description: 'Đơn vị đo độ dài (m, dm, cm, mm); đo khối lượng (kg, g); đo dung tích (l, ml); thời gian (ngày, tháng, năm; giờ, phút)',
    subject: 'MEASUREMENT', grade: 2, level: 'co_ban', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t2_7.id, name: 'Đơn vị đo độ dài', order: 1,
    definition: '1m = 10dm = 100cm = 1000mm. Quan hệ giữa các đơn vị đo độ dài liên tiếp là 10.',
    formula: '1m = 10dm; 1dm = 10cm; 1cm = 10mm',
    example: '3m 5dm = 35dm; 120cm = 1m 20cm',
    hints: ['m > dm > cm > mm', 'Đơn vị liên tiếp gấp/kém nhau 10 lần'] });
  await upsertConcept({ topicId: t2_7.id, name: 'Đơn vị đo khối lượng và dung tích', order: 2,
    definition: '1kg = 1000g; 1l = 1000ml.',
    example: '2kg 500g = 2500g; 1l 200ml = 1200ml',
    hints: ['kg dùng cân đồ vật', 'l dùng đo chất lỏng'] });
  await upsertConcept({ topicId: t2_7.id, name: 'Thời gian — Ngày, tháng, năm', order: 3,
    definition: '1 năm = 12 tháng; 1 tuần = 7 ngày. Các tháng có 30, 31 ngày (tháng 2 có 28 hoặc 29 ngày).',
    example: 'Tháng 1 có 31 ngày. Tháng 4 có 30 ngày. Năm nhuận tháng 2 có 29 ngày.',
    hints: ['Đếm đốt tay để nhớ tháng dài/ngắn'] });
  await upsertExercise({
    title: 'Bài tập đo lường lớp 2', type: 'FILL_BLANK', subject: 'MEASUREMENT',
    grade: 2, level: 'co_ban', timeLimit: 600, topicId: t2_7.id, createdBy: adminId,
    questions: [
      { content: '3m = ? dm', answer: '30', explanation: '1m = 10dm, nên 3m = 30dm', order: 1 },
      { content: '150cm = ? m ? cm', answer: '1m 50cm', explanation: '150cm = 100cm + 50cm = 1m 50cm', order: 2 },
      { content: '2kg 300g = ? g', answer: '2300', explanation: '2kg = 2000g, cộng 300g = 2300g', order: 3 },
      { content: '1 năm có bao nhiêu tháng?', answer: '12', explanation: '1 năm = 12 tháng', order: 4 },
      { content: 'Tháng 3 có bao nhiêu ngày?', answer: '31', explanation: 'Tháng 3 có 31 ngày', order: 5 },
    ],
  });

  console.log('  ✅ Lớp 2 xong');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 3
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade3(adminId: string) {
  console.log('  📗 Lớp 3...');

  // ── Chương 1: Số và phép tính trong phạm vi 100 000 ───────────────────────
  const t3_1 = await upsertTopic({
    title: 'Các số trong phạm vi 100 000',
    description: 'Đọc, viết, phân tích cấu tạo số; so sánh, sắp xếp thứ tự các số đến 100 000',
    subject: 'NUMBER_THEORY', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_1.id, name: 'Cấu tạo số có 5 chữ số', order: 1,
    definition: 'Số có 5 chữ số gồm: hàng chục nghìn, hàng nghìn, hàng trăm, hàng chục, hàng đơn vị.',
    formula: 'Số = a×10000 + b×1000 + c×100 + d×10 + e',
    example: '32 547 = 3 chục nghìn + 2 nghìn + 5 trăm + 4 chục + 7 đơn vị',
    hints: ['Đọc từng nhóm 3 chữ số từ trái sang phải'] });
  await upsertConcept({ topicId: t3_1.id, name: 'So sánh số có nhiều chữ số', order: 2,
    definition: 'Số có nhiều chữ số hơn thì lớn hơn. Nếu cùng số chữ số, so từ hàng cao nhất.',
    example: '45 678 > 9 999 (vì 5 chữ số > 4 chữ số); 32 547 < 32 574 (so hàng chục: 4 < 7)',
    hints: ['Đếm số chữ số trước', 'Cùng chữ số → so từ trái sang phải'] });

  const t3_2 = await upsertTopic({
    title: 'Phép nhân số có 2–3 chữ số với số có 1 chữ số',
    description: 'Nhân số có 2–3 chữ số với số có 1 chữ số có nhớ và không nhớ',
    subject: 'ARITHMETIC', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_2.id, name: 'Nhân số có 2 chữ số với số có 1 chữ số', order: 1,
    definition: 'Nhân lần lượt từ hàng đơn vị đến hàng chục, có nhớ nếu tích ≥ 10.',
    formula: '(ab) × c = b×c + a×c×10',
    example: '24 × 3: 4×3=12 viết 2 nhớ 1; 2×3=6 cộng 1=7; kết quả 72',
    hints: ['Nhân từ phải sang trái', 'Nhớ khi tích ≥ 10'] });
  await upsertConcept({ topicId: t3_2.id, name: 'Nhân số có 3 chữ số với số có 1 chữ số', order: 2,
    definition: 'Thực hiện tương tự, nhân qua cả hàng trăm.',
    example: '213 × 3 = 639; 125 × 4 = 500',
    solution: '125 × 4: 5×4=20 viết 0 nhớ 2; 2×4=8+2=10 viết 0 nhớ 1; 1×4=4+1=5; kết quả 500',
    hints: ['Nhân từ hàng đơn vị → chục → trăm'] });
  await upsertExercise({
    title: 'Luyện nhân có 2-3 chữ số với 1 chữ số', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 3, level: 'trung_binh', timeLimit: 600, topicId: t3_2.id, createdBy: adminId,
    questions: [
      { content: '43 × 2 = ?', answer: '86', explanation: '3×2=6; 4×2=8; kết quả 86', order: 1 },
      { content: '76 × 4 = ?', answer: '304', explanation: '6×4=24 viết 4 nhớ 2; 7×4=28+2=30; kết quả 304', order: 2 },
      { content: '215 × 3 = ?', answer: '645', explanation: '5×3=15 viết 5 nhớ 1; 1×3=3+1=4; 2×3=6; kết quả 645', order: 3 },
      { content: '108 × 6 = ?', answer: '648', explanation: '8×6=48 viết 8 nhớ 4; 0×6=0+4=4; 1×6=6; kết quả 648', order: 4 },
    ],
  });

  const t3_3 = await upsertTopic({
    title: 'Phép chia số có 2–3 chữ số cho số có 1 chữ số',
    description: 'Chia số có 2–3 chữ số cho số có 1 chữ số có dư và không dư',
    subject: 'ARITHMETIC', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_3.id, name: 'Chia không dư', order: 1,
    definition: 'Chia có dư = 0. Thực hiện chia từng hàng từ trái sang phải.',
    example: '96 ÷ 3: 9÷3=3; 6÷3=2; kết quả 32',
    hints: ['Chia từ hàng cao nhất (trái) sang phải'] });
  await upsertConcept({ topicId: t3_3.id, name: 'Chia có dư', order: 2,
    definition: 'Chia có dư là phép chia mà số bị chia không chia hết cho số chia. Số dư < số chia.',
    formula: 'Số bị chia = Thương × Số chia + Số dư (0 ≤ số dư < số chia)',
    example: '100 ÷ 3 = 33 dư 1; kiểm tra: 33×3+1 = 99+1 = 100 ✓',
    hints: ['Số dư luôn nhỏ hơn số chia', 'Kiểm tra: thương × số chia + dư = số bị chia'] });
  await upsertExercise({
    title: 'Luyện chia có 2-3 chữ số cho 1 chữ số', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 3, level: 'trung_binh', timeLimit: 600, topicId: t3_3.id, createdBy: adminId,
    questions: [
      { content: '84 ÷ 4 = ?', answer: '21', explanation: '8÷4=2; 4÷4=1; kết quả 21', order: 1 },
      { content: '95 ÷ 3 = ? dư ?', answer: '31 dư 2', explanation: '9÷3=3; 5÷3=1 dư 2; kết quả 31 dư 2', order: 2 },
      { content: '648 ÷ 6 = ?', answer: '108', explanation: '6÷6=1; 4÷6=0 dư 4; 48÷6=8; kết quả 108', order: 3 },
      { content: '250 ÷ 5 = ?', answer: '50', explanation: '25÷5=5; 0÷5=0; kết quả 50', order: 4 },
    ],
  });

  // ── Chương 2: Hình học và đo lường ────────────────────────────────────────
  const t3_4 = await upsertTopic({
    title: 'Hình học lớp 3 — Góc, diện tích hình chữ nhật và hình vuông',
    description: 'Góc vuông, góc không vuông; diện tích và chu vi hình chữ nhật, hình vuông',
    subject: 'GEOMETRY', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_4.id, name: 'Góc vuông và góc không vuông', order: 1,
    definition: 'Góc vuông = 90°. Góc nhọn < 90°. Góc tù > 90°. Dùng ê-ke để kiểm tra góc vuông.',
    example: 'Góc ở 4 góc của hình chữ nhật và hình vuông đều là góc vuông.',
    hints: ['Dùng ê-ke để đo góc vuông', 'Hình vuông có 4 góc vuông'] });
  await upsertConcept({ topicId: t3_4.id, name: 'Diện tích hình chữ nhật', order: 2,
    definition: 'Diện tích hình chữ nhật = chiều dài × chiều rộng.',
    formula: 'S = a × b (cm², m²,...)',
    example: 'Hình chữ nhật dài 8cm, rộng 5cm → S = 8 × 5 = 40 cm²',
    hints: ['Đơn vị diện tích: cm², dm², m²'] });
  await upsertConcept({ topicId: t3_4.id, name: 'Diện tích hình vuông', order: 3,
    definition: 'Diện tích hình vuông = cạnh × cạnh.',
    formula: 'S = a × a = a² (cm², m²,...)',
    example: 'Hình vuông cạnh 6cm → S = 6 × 6 = 36 cm²',
    hints: ['Hình vuông là trường hợp đặc biệt của hình chữ nhật (a = b)'] });
  await upsertExercise({
    title: 'Bài tập diện tích hình chữ nhật và hình vuông', type: 'FILL_BLANK', subject: 'GEOMETRY',
    grade: 3, level: 'trung_binh', timeLimit: 600, topicId: t3_4.id, createdBy: adminId,
    questions: [
      { content: 'Hình chữ nhật dài 9cm, rộng 4cm. Diện tích = ? cm²', answer: '36', explanation: 'S = 9 × 4 = 36 cm²', order: 1 },
      { content: 'Hình vuông cạnh 7cm. Diện tích = ? cm²', answer: '49', explanation: 'S = 7 × 7 = 49 cm²', order: 2 },
      { content: 'Hình chữ nhật có diện tích 48cm², chiều rộng 6cm. Chiều dài = ? cm', answer: '8', explanation: 'a = 48 ÷ 6 = 8cm', order: 3 },
      { content: 'Hình vuông có chu vi 28cm. Diện tích = ? cm²', answer: '49', explanation: 'cạnh = 28÷4 = 7cm; S = 7×7 = 49cm²', order: 4 },
    ],
  });

  const t3_5 = await upsertTopic({
    title: 'Phân số đơn giản',
    description: 'Giới thiệu phân số; đọc viết phân số; so sánh phân số đơn giản; phân số của một số',
    subject: 'ARITHMETIC', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_5.id, name: 'Khái niệm phân số', order: 1,
    definition: 'Phân số a/b (a là tử số, b là mẫu số, b ≠ 0) biểu thị a phần trong b phần bằng nhau.',
    formula: 'Phân số = Tử số / Mẫu số',
    example: '3/4 đọc là "ba phần tư" — chia 1 cái thành 4 phần bằng nhau, lấy 3 phần.',
    hints: ['Tử số là số phần lấy', 'Mẫu số là số phần chia đều'] });
  await upsertConcept({ topicId: t3_5.id, name: 'Một phần mấy của một số', order: 2,
    definition: '1/n của m = m ÷ n. Chia đều m thành n phần bằng nhau, mỗi phần là 1/n của m.',
    example: '1/4 của 20 = 20 ÷ 4 = 5; 1/3 của 18 = 18 ÷ 3 = 6',
    hints: ['1/n của m = m ÷ n'] });
  await upsertExercise({
    title: 'Bài tập phân số lớp 3', type: 'MULTIPLE_CHOICE', subject: 'ARITHMETIC',
    grade: 3, level: 'trung_binh', timeLimit: 600, topicId: t3_5.id, createdBy: adminId,
    questions: [
      { content: '1/5 của 30 = ?', answer: '6', options: ['5', '6', '7', '8'], order: 1 },
      { content: '1/4 của 36 = ?', answer: '9', options: ['6', '8', '9', '12'], order: 2 },
      { content: 'Phân số nào biểu thị 2 phần trong 5 phần bằng nhau?', answer: '2/5', options: ['5/2', '2/5', '3/5', '1/5'], order: 3 },
      { content: '1/3 của 24 = ?', answer: '8', options: ['6', '7', '8', '9'], order: 4 },
    ],
  });

  const t3_6 = await upsertTopic({
    title: 'Đo lường lớp 3 — km, tấn, thời gian',
    description: 'Đơn vị đo độ dài km; đơn vị đo khối lượng tấn, tạ, yến; năm, thập kỷ, thế kỷ',
    subject: 'MEASUREMENT', grade: 3, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t3_6.id, name: 'Đơn vị đo độ dài km', order: 1,
    definition: '1km = 1000m. km dùng đo khoảng cách xa.',
    example: 'Từ Hà Nội đến TP.HCM khoảng 1730 km.',
    hints: ['1km = 1000m; 1m = 100cm'] });
  await upsertConcept({ topicId: t3_6.id, name: 'Đơn vị đo khối lượng', order: 2,
    definition: '1 tấn = 10 tạ = 100 yến = 1000 kg.',
    formula: '1 tấn = 1000 kg; 1 tạ = 100 kg; 1 yến = 10 kg',
    example: '2 tấn 5 tạ = 2500 kg',
    hints: ['Tấn dùng cân xe, máy móc nặng'] });
  await upsertConcept({ topicId: t3_6.id, name: 'Năm, thập kỷ, thế kỷ', order: 3,
    definition: '1 thập kỷ = 10 năm; 1 thế kỷ = 100 năm.',
    example: 'Năm 2000 thuộc thế kỷ XX (thế kỷ 20). Năm 2001-2100 thuộc thế kỷ XXI.',
    hints: ['Thế kỷ = 100 năm', 'Thế kỷ XXI bắt đầu từ năm 2001'] });

  console.log('  ✅ Lớp 3 xong');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 4
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade4(adminId: string) {
  console.log('  📙 Lớp 4...');

  // ── Chương 1: Số tự nhiên ──────────────────────────────────────────────────
  const t4_1 = await upsertTopic({
    title: 'Số tự nhiên — Triệu, tỉ',
    description: 'Lớp triệu, lớp tỉ; đọc, viết số đến lớp tỉ; so sánh và sắp xếp số tự nhiên',
    subject: 'NUMBER_THEORY', grade: 4, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t4_1.id, name: 'Lớp triệu', order: 1,
    definition: 'Lớp triệu gồm: hàng triệu (10⁶), hàng chục triệu (10⁷), hàng trăm triệu (10⁸).',
    formula: '1 triệu = 1 000 000; 1 chục triệu = 10 000 000',
    example: '23 456 789 = 23 triệu 456 nghìn 789',
    hints: ['Mỗi lớp có 3 hàng', 'Đọc từng lớp từ trái sang phải'] });
  await upsertConcept({ topicId: t4_1.id, name: 'Dãy số tự nhiên', order: 2,
    definition: 'Dãy số tự nhiên: 0, 1, 2, 3, ... Vô hạn, không có số lớn nhất. Số tự nhiên bé nhất là 0.',
    example: 'Hai số tự nhiên liên tiếp hơn kém nhau 1 đơn vị.',
    hints: ['Số tự nhiên bé nhất là 0', 'Không có số tự nhiên lớn nhất'] });

  // ── Chương 2: Phân số ──────────────────────────────────────────────────────
  const t4_2 = await upsertTopic({
    title: 'Phân số — Rút gọn và quy đồng',
    description: 'Phân số bằng nhau; rút gọn phân số; quy đồng mẫu số; so sánh phân số',
    subject: 'ARITHMETIC', grade: 4, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t4_2.id, name: 'Phân số bằng nhau', order: 1,
    definition: 'Nhân (hoặc chia) cả tử và mẫu với cùng một số khác 0, ta được phân số bằng phân số đã cho.',
    formula: 'a/b = (a×k)/(b×k) = (a÷k)/(b÷k) với k ≠ 0',
    example: '2/3 = 4/6 = 6/9 = 8/12',
    hints: ['Nhân hoặc chia cả tử lẫn mẫu với cùng một số'] });
  await upsertConcept({ topicId: t4_2.id, name: 'Rút gọn phân số', order: 2,
    definition: 'Chia cả tử và mẫu cho UCLN của chúng để được phân số tối giản.',
    formula: 'a/b → (a÷UCLN)/(b÷UCLN)',
    example: '12/18: UCLN(12,18)=6 → 12÷6 / 18÷6 = 2/3',
    hints: ['UCLN là ước chung lớn nhất', 'Phân số tối giản khi tử và mẫu có UCLN = 1'] });
  await upsertConcept({ topicId: t4_2.id, name: 'Quy đồng mẫu số', order: 3,
    definition: 'Biến đổi các phân số có mẫu số khác nhau về phân số có cùng mẫu số (BCNN).',
    formula: 'BCNN(b, d) là mẫu chung; a/b = (a × BCNN/b) / BCNN',
    example: 'Quy đồng 1/3 và 1/4: BCNN(3,4)=12 → 4/12 và 3/12',
    hints: ['Tìm BCNN của các mẫu số', 'Nhân tử số với thương BCNN ÷ mẫu số cũ'] });
  await upsertExercise({
    title: 'Rút gọn và quy đồng phân số', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 4, level: 'trung_binh', timeLimit: 600, topicId: t4_2.id, createdBy: adminId,
    questions: [
      { content: 'Rút gọn 8/12 = ?', answer: '2/3', explanation: 'UCLN(8,12)=4 → 8÷4/12÷4 = 2/3', order: 1 },
      { content: 'Rút gọn 15/25 = ?', answer: '3/5', explanation: 'UCLN(15,25)=5 → 3/5', order: 2 },
      { content: 'Quy đồng 1/2 và 1/3, mẫu chung = ?', answer: '6', explanation: 'BCNN(2,3)=6', order: 3 },
      { content: '5/6 + 1/4 = ? (sau khi quy đồng)', answer: '13/12', explanation: 'BCNN=12; 10/12 + 3/12 = 13/12', order: 4 },
    ],
  });

  const t4_3 = await upsertTopic({
    title: 'Phép tính với phân số',
    description: 'Cộng, trừ phân số cùng mẫu và khác mẫu; nhân, chia phân số',
    subject: 'ARITHMETIC', grade: 4, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t4_3.id, name: 'Cộng trừ phân số cùng mẫu', order: 1,
    definition: 'Giữ nguyên mẫu, cộng (hoặc trừ) tử số.',
    formula: 'a/c + b/c = (a+b)/c; a/c − b/c = (a−b)/c',
    example: '3/7 + 2/7 = 5/7; 5/8 − 3/8 = 2/8 = 1/4' });
  await upsertConcept({ topicId: t4_3.id, name: 'Cộng trừ phân số khác mẫu', order: 2,
    definition: 'Quy đồng mẫu số rồi cộng trừ như cùng mẫu.',
    example: '1/2 + 1/3: quy đồng → 3/6 + 2/6 = 5/6',
    hints: ['Bước 1: Quy đồng', 'Bước 2: Cộng/trừ tử', 'Bước 3: Rút gọn nếu được'] });
  await upsertConcept({ topicId: t4_3.id, name: 'Nhân phân số', order: 3,
    definition: 'Nhân tử với tử, mẫu với mẫu.',
    formula: 'a/b × c/d = (a×c)/(b×d)',
    example: '2/3 × 4/5 = 8/15',
    hints: ['Có thể rút gọn chéo trước khi nhân'] });
  await upsertConcept({ topicId: t4_3.id, name: 'Chia phân số', order: 4,
    definition: 'Nhân với phân số nghịch đảo của số chia.',
    formula: 'a/b ÷ c/d = a/b × d/c = (a×d)/(b×c)',
    example: '3/4 ÷ 2/5 = 3/4 × 5/2 = 15/8',
    hints: ['Nghịch đảo = lật tử và mẫu', 'Chia = nhân với nghịch đảo'] });
  await upsertExercise({
    title: 'Luyện phép tính phân số lớp 4', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 4, level: 'trung_binh', timeLimit: 600, topicId: t4_3.id, createdBy: adminId,
    questions: [
      { content: '3/5 + 1/5 = ?', answer: '4/5', explanation: 'Cùng mẫu 5: 3+1=4 → 4/5', order: 1 },
      { content: '1/2 + 1/4 = ?', answer: '3/4', explanation: 'Quy đồng: 2/4 + 1/4 = 3/4', order: 2 },
      { content: '3/4 × 2/3 = ?', answer: '1/2', explanation: '(3×2)/(4×3) = 6/12 = 1/2', order: 3 },
      { content: '5/6 ÷ 5/3 = ?', answer: '1/2', explanation: '5/6 × 3/5 = 15/30 = 1/2', order: 4 },
      { content: '7/8 − 3/8 = ?', answer: '1/2', explanation: '(7−3)/8 = 4/8 = 1/2', order: 5 },
    ],
  });

  // ── Chương 3: Số thập phân ─────────────────────────────────────────────────
  const t4_4 = await upsertTopic({
    title: 'Giới thiệu số thập phân',
    description: 'Khái niệm số thập phân; hàng của số thập phân (phần nguyên, phần thập phân); đọc, viết số thập phân',
    subject: 'NUMBER_THEORY', grade: 4, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t4_4.id, name: 'Cấu tạo số thập phân', order: 1,
    definition: 'Số thập phân gồm phần nguyên và phần thập phân, ngăn cách bởi dấu phẩy. Hàng thập phân: phần mười, phần trăm, phần nghìn...',
    formula: 'a,bcd = a + b/10 + c/100 + d/1000',
    example: '3,14 = 3 + 1/10 + 4/100 = 3 phần nguyên, 14 phần trăm',
    hints: ['Chữ số sau dấu phẩy đầu tiên là hàng phần mười'] });
  await upsertConcept({ topicId: t4_4.id, name: 'So sánh số thập phân', order: 2,
    definition: 'So sánh phần nguyên trước, nếu bằng nhau so phần thập phân từ trái sang phải.',
    example: '3,14 < 3,5 vì phần nguyên bằng nhau (đều là 3), phần mười 1 < 5',
    hints: ['Thêm số 0 vào cuối để bằng chữ số thập phân rồi so'] });
  await upsertExercise({
    title: 'Bài tập số thập phân lớp 4', type: 'MULTIPLE_CHOICE', subject: 'NUMBER_THEORY',
    grade: 4, level: 'trung_binh', timeLimit: 600, topicId: t4_4.id, createdBy: adminId,
    questions: [
      { content: 'Số nào lớn nhất: 2,5 ; 2,35 ; 2,50 ; 2,09?', answer: '2,5', options: ['2,5', '2,35', '2,50', '2,09'], order: 1 },
      { content: '5,7 = ? phần mười', answer: '57', options: ['5', '7', '57', '570'], order: 2 },
      { content: 'Viết phân số 3/10 dưới dạng số thập phân', answer: '0,3', options: ['3,0', '0,3', '0,03', '30'], order: 3 },
      { content: 'Số nào bé nhất: 4,12 ; 4,21 ; 4,1 ; 4,2?', answer: '4,1', options: ['4,12', '4,21', '4,1', '4,2'], order: 4 },
    ],
  });

  // ── Chương 4: Hình học lớp 4 ──────────────────────────────────────────────
  const t4_5 = await upsertTopic({
    title: 'Hình học lớp 4 — Góc, đường thẳng song song và vuông góc',
    description: 'Góc nhọn, góc tù, góc bẹt; hai đường thẳng vuông góc; hai đường thẳng song song; hình thang, hình bình hành',
    subject: 'GEOMETRY', grade: 4, level: 'trung_binh', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t4_5.id, name: 'Góc nhọn, góc tù, góc bẹt', order: 1,
    definition: 'Góc nhọn < 90°; Góc vuông = 90°; Góc tù: 90° < α < 180°; Góc bẹt = 180°.',
    example: 'Góc của mái nhà thường là góc nhọn. Góc của bàn là góc vuông.',
    hints: ['Dùng thước đo góc (thước đo độ) để xác định loại góc'] });
  await upsertConcept({ topicId: t4_5.id, name: 'Hai đường thẳng vuông góc', order: 2,
    definition: 'Hai đường thẳng vuông góc là hai đường thẳng cắt nhau tạo thành góc vuông (90°).',
    example: 'Hai cạnh liền nhau của hình chữ nhật vuông góc với nhau.',
    hints: ['Ký hiệu vuông góc: ⊥'] });
  await upsertConcept({ topicId: t4_5.id, name: 'Hai đường thẳng song song', order: 3,
    definition: 'Hai đường thẳng song song không bao giờ cắt nhau, cách đều nhau ở mọi điểm.',
    example: 'Hai cạnh đối diện của hình chữ nhật song song với nhau.',
    hints: ['Ký hiệu song song: ∥'] });
  await upsertConcept({ topicId: t4_5.id, name: 'Hình bình hành', order: 4,
    definition: 'Hình bình hành có hai cặp cạnh đối song song và bằng nhau. Diện tích = đáy × chiều cao.',
    formula: 'S = a × h (a: cạnh đáy; h: chiều cao tương ứng)',
    example: 'Hình bình hành đáy 8cm, cao 5cm → S = 8 × 5 = 40 cm²',
    hints: ['Chiều cao vuông góc với đáy'] });
  await upsertExercise({
    title: 'Bài tập hình học lớp 4', type: 'MULTIPLE_CHOICE', subject: 'GEOMETRY',
    grade: 4, level: 'trung_binh', timeLimit: 600, topicId: t4_5.id, createdBy: adminId,
    questions: [
      { content: 'Góc 120° là loại góc gì?', answer: 'Góc tù', options: ['Góc nhọn', 'Góc vuông', 'Góc tù', 'Góc bẹt'], order: 1 },
      { content: 'Hình bình hành có đáy 10cm, cao 6cm. Diện tích = ? cm²', answer: '60', options: ['32', '60', '64', '16'], order: 2 },
      { content: 'Hai đường thẳng cắt nhau tạo góc 90° thì gọi là gì?', answer: 'Vuông góc', options: ['Song song', 'Vuông góc', 'Xiên', 'Thẳng hàng'], order: 3 },
    ],
  });

  // ── Toán có lời văn lớp 4 ─────────────────────────────────────────────────
  const t4_6 = await upsertTopic({
    title: 'Toán có lời văn lớp 4',
    description: 'Giải bài toán liên quan đến phân số, số thập phân trong thực tiễn',
    subject: 'WORD_PROBLEM', grade: 4, level: 'trung_binh', lessonType: 'luyen_tap', createdBy: adminId,
  });
  await upsertExercise({
    title: 'Toán có lời văn — Phân số và đo lường', type: 'FILL_BLANK', subject: 'WORD_PROBLEM',
    grade: 4, level: 'trung_binh', timeLimit: 900, topicId: t4_6.id, createdBy: adminId,
    questions: [
      { content: 'Một sợi dây dài 3/4 m. Dùng 1/2 sợi dây đó. Đã dùng bao nhiêu mét?', answer: '3/8 m', explanation: '3/4 × 1/2 = 3/8 m', order: 1 },
      { content: 'Lớp có 36 học sinh, 1/4 là học sinh giỏi. Có bao nhiêu học sinh giỏi?', answer: '9', explanation: '36 × 1/4 = 9 học sinh', order: 2 },
      { content: 'Một mảnh vườn hình chữ nhật dài 12m, rộng 8m. Diện tích = ? m²', answer: '96', explanation: 'S = 12 × 8 = 96 m²', order: 3 },
      { content: 'Bình mua 2,5 kg táo giá 15 000đ/kg. Tổng tiền = ?', answer: '37500', explanation: '2,5 × 15000 = 37500 đồng', order: 4 },
    ],
  });

  console.log('  ✅ Lớp 4 xong');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 5
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade5(adminId: string) {
  console.log('  📕 Lớp 5...');

  // ── Chương 1: Phân số và tỉ số phần trăm ──────────────────────────────────
  const t5_1 = await upsertTopic({
    title: 'Hỗn số và phân số thập phân',
    description: 'Hỗn số; chuyển hỗn số thành phân số; phân số thập phân và số thập phân',
    subject: 'ARITHMETIC', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_1.id, name: 'Hỗn số', order: 1,
    definition: 'Hỗn số gồm phần nguyên và phần phân số. Hỗn số = phần nguyên + phân số.',
    formula: 'a b/c = (a×c + b)/c',
    example: '2 3/4 = (2×4+3)/4 = 11/4',
    hints: ['Nhân phần nguyên với mẫu rồi cộng tử'] });
  await upsertConcept({ topicId: t5_1.id, name: 'Phân số thập phân', order: 2,
    definition: 'Phân số thập phân là phân số có mẫu là 10, 100, 1000,... Mọi phân số thập phân đều viết được thành số thập phân.',
    formula: 'a/10 = 0,a; a/100 = 0,0a; a/1000 = 0,00a',
    example: '7/10 = 0,7; 25/100 = 0,25; 125/1000 = 0,125',
    hints: ['Số chữ số sau dấy phẩy = số chữ số 0 ở mẫu'] });

  const t5_2 = await upsertTopic({
    title: 'Tỉ số phần trăm',
    description: 'Khái niệm tỉ số phần trăm; tìm tỉ số phần trăm của hai số; tìm giá trị phần trăm; tìm một số khi biết phần trăm',
    subject: 'ARITHMETIC', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_2.id, name: 'Tỉ số phần trăm', order: 1,
    definition: 'Tỉ số phần trăm của a so với b = (a ÷ b) × 100%. Ký hiệu %.',
    formula: '% = (a ÷ b) × 100',
    example: '15 so với 60: (15÷60)×100 = 25%',
    hints: ['% là cách viết khác của /100'] });
  await upsertConcept({ topicId: t5_2.id, name: 'Tìm giá trị phần trăm của một số', order: 2,
    definition: 'p% của n = n × p ÷ 100.',
    formula: 'Giá trị = Số × p ÷ 100',
    example: '20% của 150 = 150 × 20 ÷ 100 = 30',
    hints: ['Nhân số với phần trăm rồi chia 100'] });
  await upsertConcept({ topicId: t5_2.id, name: 'Tìm một số khi biết p% của nó', order: 3,
    definition: 'Nếu p% của x = a thì x = a × 100 ÷ p.',
    formula: 'x = a × 100 ÷ p',
    example: '25% của x = 30 → x = 30 × 100 ÷ 25 = 120',
    hints: ['Lấy giá trị đã biết × 100 ÷ phần trăm'] });
  await upsertExercise({
    title: 'Bài tập tỉ số phần trăm', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 5, level: 'nang_cao', timeLimit: 600, topicId: t5_2.id, createdBy: adminId,
    questions: [
      { content: '30% của 200 = ?', answer: '60', explanation: '200 × 30 ÷ 100 = 60', order: 1 },
      { content: '15 là bao nhiêu % của 75?', answer: '20', explanation: '(15÷75)×100 = 20%', order: 2 },
      { content: '40% của x = 80. Tìm x?', answer: '200', explanation: 'x = 80×100÷40 = 200', order: 3 },
      { content: 'Giá áo 120 000đ, giảm 25%. Giá sau khi giảm = ?', answer: '90000', explanation: 'Giảm = 120000×25÷100=30000; Giá còn = 120000-30000=90000đ', order: 4 },
      { content: 'Lớp 40 HS, có 35% đi xe đạp. Bao nhiêu HS đi xe đạp?', answer: '14', explanation: '40×35÷100=14 HS', order: 5 },
    ],
  });

  // ── Chương 2: Số thập phân ─────────────────────────────────────────────────
  const t5_3 = await upsertTopic({
    title: 'Phép tính với số thập phân',
    description: 'Cộng, trừ, nhân, chia số thập phân; nhân chia với 10, 100, 1000',
    subject: 'ARITHMETIC', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_3.id, name: 'Cộng trừ số thập phân', order: 1,
    definition: 'Đặt thẳng cột theo dấu phẩy, thực hiện như số tự nhiên, đặt dấu phẩy thẳng cột.',
    example: '12,5 + 3,75 = 16,25; 8,4 − 2,15 = 6,25',
    hints: ['Dấu phẩy phải thẳng cột'] });
  await upsertConcept({ topicId: t5_3.id, name: 'Nhân số thập phân với số tự nhiên', order: 2,
    definition: 'Nhân như số tự nhiên, đếm tổng chữ số thập phân để đặt dấu phẩy ở kết quả.',
    example: '2,4 × 3 = 7,2; 1,25 × 4 = 5,00 = 5',
    hints: ['Đếm số chữ số sau dấu phẩy của tích'] });
  await upsertConcept({ topicId: t5_3.id, name: 'Nhân hai số thập phân', order: 3,
    definition: 'Nhân như số tự nhiên, tổng số chữ số thập phân của hai thừa số = số chữ số thập phân của tích.',
    formula: 'a,b × c,d: đếm tổng chữ số thập phân',
    example: '1,2 × 3,4 = 4,08 (1+1=2 chữ số thập phân)',
    hints: ['Tổng chữ số thập phân của 2 thừa số = chữ số thập phân tích'] });
  await upsertConcept({ topicId: t5_3.id, name: 'Chia số thập phân', order: 4,
    definition: 'Chia số thập phân cho số tự nhiên: chia như bình thường, đặt dấy phẩy thẳng cột. Chia cho số thập phân: nhân cả hai để số chia thành số nguyên.',
    example: '7,2 ÷ 3 = 2,4; 8,4 ÷ 0,4 = 84 ÷ 4 = 21',
    hints: ['Nhân cả hai với 10, 100... để số chia thành số nguyên'] });
  await upsertExercise({
    title: 'Luyện phép tính số thập phân', type: 'FILL_BLANK', subject: 'ARITHMETIC',
    grade: 5, level: 'nang_cao', timeLimit: 600, topicId: t5_3.id, createdBy: adminId,
    questions: [
      { content: '5,6 + 3,75 = ?', answer: '9,35', explanation: 'Đặt thẳng dấu phẩy: 5,60+3,75=9,35', order: 1 },
      { content: '12,8 − 4,56 = ?', answer: '8,24', explanation: '12,80−4,56=8,24', order: 2 },
      { content: '3,5 × 4 = ?', answer: '14', explanation: '35×4=140, 1 chữ số thập phân → 14,0=14', order: 3 },
      { content: '6,72 ÷ 0,4 = ?', answer: '16,8', explanation: '67,2 ÷ 4 = 16,8', order: 4 },
      { content: '2,5 × 0,4 = ?', answer: '1', explanation: '25×4=100, 2 chữ số thập phân → 1,00=1', order: 5 },
    ],
  });

  // ── Chương 3: Hình học lớp 5 ──────────────────────────────────────────────
  const t5_4 = await upsertTopic({
    title: 'Hình học lớp 5 — Hình tròn, diện tích, thể tích',
    description: 'Chu vi và diện tích hình tròn; diện tích tam giác; thể tích hình hộp chữ nhật và hình lập phương',
    subject: 'GEOMETRY', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_4.id, name: 'Chu vi và diện tích hình tròn', order: 1,
    definition: 'Chu vi = 2 × π × r = π × d. Diện tích = π × r². Lấy π ≈ 3,14.',
    formula: 'C = 2πr; S = πr²',
    example: 'Hình tròn bán kính 5cm: C = 2×3,14×5 = 31,4cm; S = 3,14×25 = 78,5cm²',
    hints: ['r là bán kính; d=2r là đường kính', 'π ≈ 3,14'] });
  await upsertConcept({ topicId: t5_4.id, name: 'Diện tích tam giác', order: 2,
    definition: 'Diện tích tam giác = đáy × chiều cao ÷ 2.',
    formula: 'S = (a × h) ÷ 2',
    example: 'Tam giác đáy 10cm, cao 8cm → S = (10×8)÷2 = 40cm²',
    hints: ['Chiều cao vuông góc với đáy', 'Bằng nửa hình bình hành cùng đáy và chiều cao'] });
  await upsertConcept({ topicId: t5_4.id, name: 'Thể tích hình hộp chữ nhật', order: 3,
    definition: 'Thể tích = dài × rộng × cao.',
    formula: 'V = a × b × c (cm³, dm³, m³)',
    example: 'Hộp dài 10cm, rộng 5cm, cao 4cm → V = 10×5×4 = 200cm³',
    hints: ['Đơn vị thể tích: cm³, dm³, m³'] });
  await upsertConcept({ topicId: t5_4.id, name: 'Thể tích hình lập phương', order: 4,
    definition: 'Thể tích hình lập phương = cạnh × cạnh × cạnh = cạnh³.',
    formula: 'V = a³ (cm³, dm³, m³)',
    example: 'Hình lập phương cạnh 3cm → V = 3×3×3 = 27cm³',
    hints: ['Hình lập phương là hộp chữ nhật đặc biệt (a=b=c)'] });
  await upsertExercise({
    title: 'Bài tập hình học lớp 5', type: 'FILL_BLANK', subject: 'GEOMETRY',
    grade: 5, level: 'nang_cao', timeLimit: 600, topicId: t5_4.id, createdBy: adminId,
    questions: [
      { content: 'Hình tròn bán kính 4cm. Diện tích = ? cm² (π=3,14)', answer: '50,24', explanation: 'S=3,14×4×4=3,14×16=50,24 cm²', order: 1 },
      { content: 'Tam giác đáy 12cm, cao 7cm. Diện tích = ? cm²', answer: '42', explanation: 'S=(12×7)÷2=84÷2=42 cm²', order: 2 },
      { content: 'Hộp chữ nhật 6×5×4 cm. Thể tích = ? cm³', answer: '120', explanation: 'V=6×5×4=120 cm³', order: 3 },
      { content: 'Hình lập phương cạnh 4cm. Thể tích = ? cm³', answer: '64', explanation: 'V=4×4×4=64 cm³', order: 4 },
      { content: 'Hình tròn đường kính 10cm. Chu vi = ? cm (π=3,14)', answer: '31,4', explanation: 'C=3,14×10=31,4 cm', order: 5 },
    ],
  });

  // ── Chương 4: Thống kê và xác suất ────────────────────────────────────────
  const t5_5 = await upsertTopic({
    title: 'Thống kê — Số trung bình cộng và biểu đồ',
    description: 'Tính số trung bình cộng; đọc và vẽ biểu đồ cột; biểu đồ hình quạt; thu thập và phân loại số liệu',
    subject: 'STATISTICS', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_5.id, name: 'Số trung bình cộng', order: 1,
    definition: 'Số trung bình cộng = tổng các số ÷ số lượng các số.',
    formula: 'TB = (a₁ + a₂ + ... + aₙ) ÷ n',
    example: 'Điểm 4 bài kiểm tra: 8, 7, 9, 6 → TB = (8+7+9+6)÷4 = 30÷4 = 7,5',
    hints: ['Cộng tất cả rồi chia cho số lượng'] });
  await upsertConcept({ topicId: t5_5.id, name: 'Biểu đồ cột', order: 2,
    definition: 'Biểu đồ cột dùng các cột có chiều cao tương ứng với giá trị để so sánh dữ liệu.',
    example: 'Biểu đồ cột số học sinh giỏi theo tháng giúp thấy tháng nào có nhiều HS giỏi nhất.',
    hints: ['Cột cao hơn = giá trị lớn hơn', 'Đọc giá trị trên trục dọc'] });
  await upsertConcept({ topicId: t5_5.id, name: 'Biểu đồ hình quạt', order: 3,
    definition: 'Biểu đồ hình quạt (tròn) thể hiện tỉ lệ phần trăm của từng phần so với tổng.',
    example: 'Phần quạt chiếm 25% tức là 1/4 hình tròn.',
    hints: ['Toàn bộ hình tròn = 100%', 'Phần quạt tỉ lệ với phần trăm tương ứng'] });
  await upsertExercise({
    title: 'Bài tập thống kê lớp 5', type: 'FILL_BLANK', subject: 'STATISTICS',
    grade: 5, level: 'nang_cao', timeLimit: 600, topicId: t5_5.id, createdBy: adminId,
    questions: [
      { content: 'Chiều cao 5 bạn (cm): 132, 135, 128, 140, 130. Trung bình = ? cm', answer: '133', explanation: '(132+135+128+140+130)÷5 = 665÷5 = 133cm', order: 1 },
      { content: 'Điểm 4 môn: Toán 9, Văn 7, Anh 8, Khoa học 8. Trung bình = ?', answer: '8', explanation: '(9+7+8+8)÷4 = 32÷4 = 8', order: 2 },
      { content: 'Lớp 40HS: 20 HS thích Toán, 12 HS thích Văn, 8 HS thích khác. Tỉ lệ % thích Toán = ?', answer: '50', explanation: '(20÷40)×100 = 50%', order: 3 },
    ],
  });

  // ── Toán chuyển động lớp 5 ─────────────────────────────────────────────────
  const t5_6 = await upsertTopic({
    title: 'Toán chuyển động đều',
    description: 'Vận tốc, quãng đường, thời gian; bài toán chuyển động ngược chiều và cùng chiều',
    subject: 'WORD_PROBLEM', grade: 5, level: 'nang_cao', lessonType: 'ly_thuyet', createdBy: adminId,
  });
  await upsertConcept({ topicId: t5_6.id, name: 'Vận tốc, quãng đường, thời gian', order: 1,
    definition: 'Vận tốc = Quãng đường ÷ Thời gian. Ba đại lượng liên quan: v, s, t.',
    formula: 'v = s ÷ t; s = v × t; t = s ÷ v',
    example: 'Đi 120km trong 3 giờ → v = 120÷3 = 40 km/h',
    hints: ['Nhớ tam giác v-s-t: che ô cần tìm'] });
  await upsertConcept({ topicId: t5_6.id, name: 'Hai chuyển động ngược chiều', order: 2,
    definition: 'Hai vật đi ngược chiều gặp nhau: tổng quãng đường = tổng vận tốc × thời gian.',
    formula: 's = (v₁ + v₂) × t; t = s ÷ (v₁ + v₂)',
    example: 'A đi 40km/h, B đi 30km/h, ngược chiều, cách 210km. Gặp nhau sau: 210÷(40+30) = 3 giờ',
    hints: ['Ngược chiều: cộng vận tốc'] });
  await upsertConcept({ topicId: t5_6.id, name: 'Hai chuyển động cùng chiều', order: 3,
    definition: 'Hai vật cùng chiều, vật nhanh đuổi kịp vật chậm: hiệu quãng đường = hiệu vận tốc × thời gian.',
    formula: 't = s ÷ (v₁ − v₂) (v₁ > v₂)',
    example: 'A đi 50km/h, B đi 40km/h, cùng chiều, A sau B 30km. Đuổi kịp sau: 30÷(50−40) = 3 giờ',
    hints: ['Cùng chiều: trừ vận tốc'] });
  await upsertExercise({
    title: 'Bài tập toán chuyển động', type: 'FILL_BLANK', subject: 'WORD_PROBLEM',
    grade: 5, level: 'nang_cao', timeLimit: 900, topicId: t5_6.id, createdBy: adminId,
    questions: [
      { content: 'Xe đạp đi 45km trong 3 giờ. Vận tốc = ? km/h', answer: '15', explanation: 'v = 45÷3 = 15km/h', order: 1 },
      { content: 'Ô tô đi 60km/h trong 2,5 giờ. Quãng đường = ? km', answer: '150', explanation: 's = 60×2,5 = 150km', order: 2 },
      { content: 'A và B đi ngược chiều, cách 280km. v_A=60km/h, v_B=80km/h. Gặp nhau sau ? giờ', answer: '2', explanation: 't = 280÷(60+80) = 280÷140 = 2 giờ', order: 3 },
      { content: 'Tàu hỏa đi 180km trong 2 giờ. Để đi 450km cần ? giờ', answer: '5', explanation: 'v=180÷2=90km/h; t=450÷90=5 giờ', order: 4 },
    ],
  });

  console.log('  ✅ Lớp 5 xong');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 Bắt đầu seed Toán KNTT lớp 2-5...');
  const adminId = await getAdminId();
  await seedGrade2(adminId);
  await seedGrade3(adminId);
  await seedGrade4(adminId);
  await seedGrade5(adminId);
  console.log('✅ Hoàn tất seed Toán KNTT lớp 2-5!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
