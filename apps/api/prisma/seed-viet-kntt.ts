/**
 * Seed dữ liệu Tiếng Việt lớp 2–5
 * Bộ sách: Kết nối tri thức với cuộc sống (NXB Giáo dục Việt Nam)
 *
 * Chạy: npx tsx prisma/seed-viet-kntt.ts
 */

import { PrismaClient, VietCategory, VietExerciseType } from '@prisma/client';

const prisma = new PrismaClient();
const TEXTBOOK = 'Kết nối tri thức với cuộc sống';

async function getAdminId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Chưa có tài khoản ADMIN. Chạy seed.ts trước.');
  return admin.id;
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

async function upsertSet(data: {
  id: string;
  title: string;
  description?: string;
  category: VietCategory;
  grade: number;
  level: string;
  lessonType?: string;
  createdBy: string;
}) {
  return prisma.vietSet.upsert({
    where: { id: data.id },
    update: { description: data.description },
    create: { ...data, textbook: TEXTBOOK, isPublic: true },
  });
}

async function upsertItems(
  setId: string,
  items: { word: string; meaning: string; example?: string; note?: string; order: number }[]
) {
  for (const item of items) {
    const id = `kntt-vt-item-${slugify(setId + item.word + item.order)}`;
    await prisma.vietItem.upsert({
      where: { id },
      update: {},
      create: { id, setId, ...item },
    });
  }
}

async function upsertExercise(data: {
  id: string;
  title: string;
  description?: string;
  type: VietExerciseType;
  category: VietCategory;
  grade: number;
  level: string;
  passage?: string;
  timeLimit?: number;
  setId?: string;
  createdBy: string;
  questions: {
    content: string;
    options?: string[];
    answer: any;
    explanation?: string;
    order: number;
  }[];
}) {
  const { questions, ...rest } = data;
  const ex = await prisma.vietExercise.upsert({
    where: { id: data.id },
    update: {},
    create: { ...rest, isPublic: true },
  });
  for (const q of questions) {
    const qId = `kntt-vt-q-${slugify(data.id + q.content.slice(0, 30) + q.order)}`;
    await prisma.vietQuestion.upsert({
      where: { id: qId },
      update: {},
      create: {
        id: qId,
        exerciseId: ex.id,
        content: q.content,
        options: q.options ?? null,
        answer: q.answer,
        explanation: q.explanation,
        order: q.order,
      },
    });
  }
  return ex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 2
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade2(adminId: string) {
  console.log('  📗 Lớp 2...');
  const G = 'kntt-vt-g2';

  // ── Từ vựng: Trường học ────────────────────────────────────────────────────
  const s2_1 = await upsertSet({
    id: `${G}-truong-hoc`, title: 'Từ vựng — Trường học',
    description: 'Từ vựng về đồ dùng học tập và hoạt động ở trường',
    category: 'TU_VUNG', grade: 2, level: 'co_ban', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s2_1.id, [
    { word: 'bút chì', meaning: 'dụng cụ viết bằng than chì, có thể tẩy xóa', example: 'Em dùng bút chì để vẽ hình.', order: 1 },
    { word: 'bút mực', meaning: 'dụng cụ viết có mực, thường dùng ở lớp 2 trở lên', example: 'Bút mực của em màu xanh.', order: 2 },
    { word: 'thước kẻ', meaning: 'dụng cụ dùng để kẻ đường thẳng và đo độ dài', example: 'Em dùng thước kẻ để kẻ vở.', order: 3 },
    { word: 'cặp sách', meaning: 'túi đựng sách vở mang đến trường', example: 'Em đeo cặp sách đi học mỗi ngày.', order: 4 },
    { word: 'sách giáo khoa', meaning: 'sách học chính thức dùng trong nhà trường', example: 'Sách giáo khoa Tiếng Việt lớp 2 có nhiều bài đọc hay.', order: 5 },
    { word: 'vở bài tập', meaning: 'vở dùng để làm bài tập ở lớp và ở nhà', example: 'Em làm bài vào vở bài tập Toán.', order: 6 },
    { word: 'tẩy', meaning: 'dụng cụ dùng để xóa chữ viết bằng bút chì', example: 'Em dùng tẩy để xóa chữ viết sai.', order: 7 },
    { word: 'bảng đen', meaning: 'bảng màu đen trên tường dùng để thầy cô viết bài', example: 'Thầy giáo viết chữ lên bảng đen.', order: 8 },
    { word: 'phấn', meaning: 'que nhỏ màu trắng hoặc nhiều màu dùng để viết lên bảng đen', example: 'Cô giáo dùng phấn trắng viết bài.', order: 9 },
    { word: 'thư viện', meaning: 'nơi có nhiều sách để đọc và mượn', example: 'Thư viện trường em có rất nhiều sách hay.', order: 10 },
    { word: 'sân trường', meaning: 'khoảng đất rộng trong khuôn viên trường để học sinh vui chơi', example: 'Giờ ra chơi, chúng em chạy nhảy ở sân trường.', order: 11 },
    { word: 'lớp học', meaning: 'phòng học dành cho một nhóm học sinh', example: 'Lớp học của em có 30 bạn.', order: 12 },
  ]);

  // ── Từ vựng: Gia đình ──────────────────────────────────────────────────────
  const s2_2 = await upsertSet({
    id: `${G}-gia-dinh`, title: 'Từ vựng — Gia đình',
    description: 'Từ vựng về các thành viên và hoạt động trong gia đình',
    category: 'TU_VUNG', grade: 2, level: 'co_ban', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s2_2.id, [
    { word: 'ông nội', meaning: 'bố của bố, người đàn ông lớn tuổi trong gia đình bên nội', example: 'Ông nội kể chuyện cổ tích cho em nghe.', order: 1 },
    { word: 'bà nội', meaning: 'mẹ của bố, người phụ nữ lớn tuổi trong gia đình bên nội', example: 'Bà nội nấu cơm rất ngon.', order: 2 },
    { word: 'ông ngoại', meaning: 'bố của mẹ, người đàn ông lớn tuổi trong gia đình bên ngoại', example: 'Ông ngoại hay dẫn em đi chơi công viên.', order: 3 },
    { word: 'bà ngoại', meaning: 'mẹ của mẹ, người phụ nữ lớn tuổi trong gia đình bên ngoại', example: 'Bà ngoại mua cho em chiếc áo mới.', order: 4 },
    { word: 'bố / ba', meaning: 'người đàn ông sinh ra và nuôi dưỡng mình', example: 'Bố em là kỹ sư xây dựng.', order: 5 },
    { word: 'mẹ', meaning: 'người phụ nữ sinh ra và nuôi dưỡng mình', example: 'Mẹ em nấu ăn rất ngon.', order: 6 },
    { word: 'anh trai', meaning: 'người con trai sinh trước mình trong gia đình', example: 'Anh trai em học lớp 5.', order: 7 },
    { word: 'chị gái', meaning: 'người con gái sinh trước mình trong gia đình', example: 'Chị gái em hay giúp em học bài.', order: 8 },
    { word: 'em trai', meaning: 'người con trai sinh sau mình trong gia đình', example: 'Em trai em mới 3 tuổi.', order: 9 },
    { word: 'em gái', meaning: 'người con gái sinh sau mình trong gia đình', example: 'Em gái em rất dễ thương.', order: 10 },
    { word: 'gia đình', meaning: 'nhóm người có quan hệ ruột thịt, sống chung với nhau', example: 'Gia đình em có 4 người.', order: 11 },
    { word: 'yêu thương', meaning: 'có tình cảm sâu sắc, quan tâm và chăm sóc lẫn nhau', example: 'Mọi người trong gia đình yêu thương nhau.', order: 12 },
  ]);

  // ── Từ vựng: Thiên nhiên và con vật ───────────────────────────────────────
  const s2_3 = await upsertSet({
    id: `${G}-thien-nhien`, title: 'Từ vựng — Thiên nhiên và con vật',
    description: 'Từ vựng về thiên nhiên, thời tiết, con vật quen thuộc',
    category: 'TU_VUNG', grade: 2, level: 'co_ban', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s2_3.id, [
    { word: 'mặt trời', meaning: 'ngôi sao lớn tỏa sáng và nhiệt, là nguồn sáng của ban ngày', example: 'Mặt trời mọc ở hướng đông.', order: 1 },
    { word: 'mặt trăng', meaning: 'vệ tinh tự nhiên của Trái Đất, chiếu sáng vào ban đêm', example: 'Đêm rằm, mặt trăng tròn và sáng.', order: 2 },
    { word: 'ngôi sao', meaning: 'thiên thể phát sáng trên bầu trời, nhìn thấy vào ban đêm', example: 'Bầu trời đầy ngôi sao lấp lánh.', order: 3 },
    { word: 'cây cối', meaning: 'các loài thực vật có thân gỗ hoặc thân thảo mọc trên mặt đất', example: 'Cây cối trong vườn xanh tươi.', order: 4 },
    { word: 'hoa', meaning: 'bộ phận của cây thường có màu sắc và mùi thơm', example: 'Vườn nhà em có nhiều hoa đẹp.', order: 5 },
    { word: 'con chim', meaning: 'động vật có cánh, lông vũ, bay được trên không trung', example: 'Buổi sáng, con chim hót líu lo.', order: 6 },
    { word: 'con bướm', meaning: 'côn trùng có cánh nhiều màu sắc, bay nhẹ nhàng', example: 'Con bướm đậu trên bông hoa hồng.', order: 7 },
    { word: 'con cá', meaning: 'động vật sống dưới nước, thở bằng mang', example: 'Con cá vàng bơi trong bể.', order: 8 },
    { word: 'con mèo', meaning: 'động vật nuôi trong nhà, kêu meo meo, bắt chuột', example: 'Con mèo nằm ngủ trên thảm.', order: 9 },
    { word: 'con chó', meaning: 'động vật nuôi trung thành, canh giữ nhà', example: 'Con chó vẫy đuôi mừng khi chủ về.', order: 10 },
    { word: 'mưa', meaning: 'nước từ mây rơi xuống đất', example: 'Trời mưa to, em mặc áo mưa đi học.', order: 11 },
    { word: 'nắng', meaning: 'ánh sáng và nhiệt của mặt trời chiếu xuống mặt đất', example: 'Hôm nay trời nắng đẹp.', order: 12 },
  ]);

  // ── Chính tả: Phân biệt âm đầu ────────────────────────────────────────────
  const s2_4 = await upsertSet({
    id: `${G}-chinh-ta-am-dau`, title: 'Chính tả — Phân biệt âm đầu c/k/q, g/gh, ng/ngh',
    description: 'Quy tắc viết chính tả phân biệt c/k/q và g/gh, ng/ngh',
    category: 'CHINH_TA', grade: 2, level: 'co_ban', lessonType: 'chinh_ta', createdBy: adminId,
  });
  await upsertItems(s2_4.id, [
    { word: 'c — cá, cô, cu, ca', meaning: 'c đứng trước a, o, u, ô, ơ, â', example: 'cá, cô, cua, cơm, cân', note: 'Viết c khi đứng trước nguyên âm không phải i, e, ê', order: 1 },
    { word: 'k — kẻ, ki, kê', meaning: 'k đứng trước i, e, ê', example: 'kể, kì, kêu, kiến, kẻ', note: 'Viết k khi đứng trước i, e, ê', order: 2 },
    { word: 'q — quà, quê', meaning: 'q luôn đi kèm u, tạo thành qu (đọc là /kw/)', example: 'quà, quê, qua, quân, quốc', note: 'q luôn viết cùng u: qu', order: 3 },
    { word: 'g — ga, go, gà', meaning: 'g đứng trước a, o, u, ô, ơ, â', example: 'gà, gỗ, gươm, gáo, gốc', note: 'Viết g khi đứng trước nguyên âm không phải i, e, ê', order: 4 },
    { word: 'gh — ghi, ghe', meaning: 'gh đứng trước i, e, ê', example: 'ghi, ghế, ghê, ghim, ghi nhớ', note: 'Viết gh khi đứng trước i, e, ê', order: 5 },
    { word: 'ng — nga, ngo', meaning: 'ng đứng trước a, o, u, ô, ơ, â', example: 'ngà, ngõ, ngũ, ngôi, người', note: 'Viết ng khi đứng trước nguyên âm không phải i, e, ê', order: 6 },
    { word: 'ngh — nghi, nghe', meaning: 'ngh đứng trước i, e, ê', example: 'nghỉ, nghe, nghề, nghĩ, nghệ', note: 'Viết ngh khi đứng trước i, e, ê', order: 7 },
  ]);

  // ── Ngữ pháp: Câu "Ai là gì?" và "Ai làm gì?" ────────────────────────────
  const s2_5 = await upsertSet({
    id: `${G}-ngu-phap-cau`, title: 'Ngữ pháp — Câu "Ai là gì?" và "Ai làm gì?"',
    description: 'Nhận biết và đặt câu theo mẫu Ai là gì? và Ai làm gì?',
    category: 'NGU_PHAP', grade: 2, level: 'co_ban', lessonType: 'ngu_phap', createdBy: adminId,
  });
  await upsertItems(s2_5.id, [
    { word: 'Câu "Ai là gì?"', meaning: 'Câu dùng để giới thiệu hoặc nhận xét về người/vật. Cấu trúc: Chủ ngữ + là + vị ngữ', example: 'Bố em là bác sĩ. / Cô giáo là người dạy học.', order: 1 },
    { word: 'Câu "Ai làm gì?"', meaning: 'Câu nói về hoạt động của người hoặc vật. Cấu trúc: Chủ ngữ + động từ (+ bổ ngữ)', example: 'Em học bài. / Mẹ nấu cơm.', order: 2 },
    { word: 'Chủ ngữ', meaning: 'Bộ phận chỉ người hoặc vật thực hiện hành động hoặc được nói đến', example: 'Em học bài. (Em là chủ ngữ)', order: 3 },
    { word: 'Vị ngữ', meaning: 'Bộ phận nói lên hoạt động hoặc đặc điểm của chủ ngữ', example: 'Em học bài. (học bài là vị ngữ)', order: 4 },
  ]);

  // ── Bài tập Chính tả lớp 2 ────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-chinh-ta-1`, title: 'Bài tập chính tả — c/k/q, g/gh, ng/ngh',
    description: 'Chọn chữ cái đúng để điền vào chỗ trống',
    type: 'MULTIPLE_CHOICE', category: 'CHINH_TA', grade: 2, level: 'co_ban', timeLimit: 480,
    setId: s2_4.id, createdBy: adminId,
    questions: [
      { content: 'Chọn chữ đúng: ___ẻ vạch (viết chữ gì trước "ẻ")?', options: ['k', 'c', 'q', 'g'], answer: 'k', explanation: 'Viết k trước e, ê, i. "kẻ vạch" viết là kẻ.', order: 1 },
      { content: 'Chọn chữ đúng: con ___à (con vật nuôi trong nhà)?', options: ['g', 'gh', 'k', 'c'], answer: 'g', explanation: 'g đứng trước a. "con gà" viết là gà.', order: 2 },
      { content: 'Chọn chữ đúng: ___i nhớ bài học?', options: ['gh', 'g', 'ng', 'ngh'], answer: 'gh', explanation: 'gh đứng trước i. "ghi nhớ" viết là ghi.', order: 3 },
      { content: 'Chọn chữ đúng: ___ỉ ngơi (được nghỉ)?', options: ['ngh', 'ng', 'nh', 'n'], answer: 'ngh', explanation: 'ngh đứng trước i. "nghỉ ngơi" viết là nghỉ.', order: 4 },
      { content: 'Chọn chữ đúng: ___uà tặng (món quà)?', options: ['qu', 'c', 'k', 'g'], answer: 'qu', explanation: 'q luôn đi với u: qu. "quà tặng" viết là quà.', order: 5 },
      { content: 'Điền đúng: ___ê (đồ vật để ngồi)?', options: ['gh', 'g', 'ng', 'ngh'], answer: 'gh', explanation: 'gh đứng trước ê. "ghế" viết là ghế.', order: 6 },
    ],
  });

  // ── Bài tập Ngữ pháp lớp 2 ───────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-ngu-phap-1`, title: 'Bài tập — Câu "Ai là gì?" và "Ai làm gì?"',
    description: 'Xác định kiểu câu và điền vào chỗ trống',
    type: 'MULTIPLE_CHOICE', category: 'NGU_PHAP', grade: 2, level: 'co_ban', timeLimit: 480,
    setId: s2_5.id, createdBy: adminId,
    questions: [
      { content: 'Câu "Mẹ em là giáo viên." thuộc kiểu câu nào?', options: ['Ai là gì?', 'Ai làm gì?', 'Ai thế nào?', 'Khi nào?'], answer: 'Ai là gì?', explanation: '"Mẹ em là giáo viên" có cấu trúc chủ ngữ + là + vị ngữ → kiểu câu Ai là gì?', order: 1 },
      { content: 'Câu "Bố đọc báo buổi tối." thuộc kiểu câu nào?', options: ['Ai làm gì?', 'Ai là gì?', 'Ai thế nào?', 'Ở đâu?'], answer: 'Ai làm gì?', explanation: '"Bố đọc báo" có cấu trúc chủ ngữ + động từ → kiểu câu Ai làm gì?', order: 2 },
      { content: 'Chủ ngữ trong câu "Em học bài chăm chỉ." là gì?', options: ['Em', 'học bài', 'chăm chỉ', 'bài'], answer: 'Em', explanation: 'Chủ ngữ là bộ phận chỉ người thực hiện hành động. Trong câu này, "Em" là chủ ngữ.', order: 3 },
      { content: 'Điền vào chỗ trống: "___ là học sinh lớp 2." (tên người đi trước)', options: ['Em', 'Học', 'Bài', 'Vở'], answer: 'Em', explanation: 'Câu có dạng "Ai là gì?" nên cần điền chủ ngữ chỉ người vào đầu câu.', order: 4 },
    ],
  });

  // ── Đọc hiểu lớp 2 ────────────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-doc-hieu-1`, title: 'Đọc hiểu — Buổi sáng ở vườn',
    type: 'READING', category: 'TAP_DOC', grade: 2, level: 'co_ban', timeLimit: 600,
    createdBy: adminId,
    passage: `Buổi sáng ở vườn

Mặt trời vừa mọc, ánh nắng vàng tươi chiếu khắp khu vườn. Những giọt sương còn đọng trên lá cây long lanh như viên ngọc. Chim sơn ca đậu trên cành cây hót véo von. Những bông hoa hồng đỏ thắm đua nhau khoe sắc. Con bướm vàng nhẹ nhàng bay từ bông hoa này sang bông hoa khác. Em ra vườn hít thở không khí trong lành, lòng em thấy vui và yêu cuộc sống biết bao.`,
    questions: [
      { content: 'Bài văn nói về cảnh vật ở đâu?', options: ['Ở vườn', 'Ở trường', 'Ở bờ sông', 'Ở cánh đồng'], answer: 'Ở vườn', explanation: 'Tiêu đề bài là "Buổi sáng ở vườn", bài văn miêu tả cảnh vật trong khu vườn.', order: 1 },
      { content: 'Con vật nào được nhắc đến trong bài?', options: ['Chim sơn ca và bướm vàng', 'Chim sẻ và mèo', 'Con ong và chó', 'Bướm trắng và chim công'], answer: 'Chim sơn ca và bướm vàng', explanation: 'Bài có nhắc: "Chim sơn ca đậu trên cành cây hót véo von" và "Con bướm vàng nhẹ nhàng bay".', order: 2 },
      { content: 'Những giọt sương trên lá cây được so sánh với gì?', options: ['Viên ngọc', 'Hạt mưa', 'Giọt nước', 'Ánh đèn'], answer: 'Viên ngọc', explanation: '"Những giọt sương còn đọng trên lá cây long lanh như viên ngọc."', order: 3 },
      { content: 'Khi ra vườn, em cảm thấy thế nào?', options: ['Vui và yêu cuộc sống', 'Buồn và mệt mỏi', 'Sợ hãi', 'Chán nản'], answer: 'Vui và yêu cuộc sống', explanation: '"lòng em thấy vui và yêu cuộc sống biết bao."', order: 4 },
    ],
  });

  console.log('    ✓ Lớp 2 hoàn thành');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 3
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade3(adminId: string) {
  console.log('  📘 Lớp 3...');
  const G = 'kntt-vt-g3';

  // ── Từ vựng: Cộng đồng và quê hương ──────────────────────────────────────
  const s3_1 = await upsertSet({
    id: `${G}-cong-dong`, title: 'Từ vựng — Cộng đồng và quê hương',
    description: 'Từ vựng về cộng đồng, làng xóm, quê hương đất nước',
    category: 'TU_VUNG', grade: 3, level: 'co_ban', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s3_1.id, [
    { word: 'quê hương', meaning: 'nơi chôn rau cắt rốn, nơi mình được sinh ra và lớn lên', example: 'Em yêu quê hương Việt Nam.', order: 1 },
    { word: 'làng xóm', meaning: 'khu dân cư nhỏ ở nông thôn, gồm nhiều gia đình sống gần nhau', example: 'Làng xóm em rất đoàn kết và thân thiện.', order: 2 },
    { word: 'hàng xóm', meaning: 'người sống ở nhà gần kế bên', example: 'Hàng xóm giúp nhau lúc khó khăn.', order: 3 },
    { word: 'cộng đồng', meaning: 'tập thể người cùng sống và làm việc trong một khu vực', example: 'Cộng đồng dân cư cùng nhau giữ gìn vệ sinh.', order: 4 },
    { word: 'bảo vệ', meaning: 'giữ gìn, che chở không cho bị hại', example: 'Chúng ta cần bảo vệ môi trường.', order: 5 },
    { word: 'truyền thống', meaning: 'phong tục, tập quán được truyền lại qua nhiều thế hệ', example: 'Uống nước nhớ nguồn là truyền thống tốt đẹp.', order: 6 },
    { word: 'lễ hội', meaning: 'sự kiện văn hóa truyền thống được tổ chức định kỳ', example: 'Lễ hội mùa xuân rất vui và náo nhiệt.', order: 7 },
    { word: 'dân tộc', meaning: 'cộng đồng người có chung ngôn ngữ, văn hóa và lịch sử', example: 'Việt Nam có 54 dân tộc anh em.', order: 8 },
    { word: 'tổ quốc', meaning: 'đất nước của mình, nơi tổ tiên mình đã sống', example: 'Em yêu Tổ quốc Việt Nam.', order: 9 },
    { word: 'đoàn kết', meaning: 'cùng nhau gắn bó, giúp đỡ lẫn nhau', example: 'Đoàn kết là sức mạnh của dân tộc.', order: 10 },
  ]);

  // ── Từ vựng: Thiên nhiên và mùa ─────────────────────────────────────────
  const s3_2 = await upsertSet({
    id: `${G}-thien-nhien-mua`, title: 'Từ vựng — Thiên nhiên theo mùa',
    description: 'Từ vựng về bốn mùa xuân hạ thu đông và thiên nhiên Việt Nam',
    category: 'TU_VUNG', grade: 3, level: 'co_ban', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s3_2.id, [
    { word: 'mùa xuân', meaning: 'mùa đầu năm, tiết trời ấm áp, cây cối đâm chồi nảy lộc', example: 'Mùa xuân, hoa đào nở rực rỡ.', order: 1 },
    { word: 'mùa hạ (mùa hè)', meaning: 'mùa nóng nhất trong năm, học sinh được nghỉ hè', example: 'Mùa hè, ve sầu kêu râm ran.', order: 2 },
    { word: 'mùa thu', meaning: 'mùa mát mẻ, lá cây chuyển vàng và rụng', example: 'Mùa thu, lá vàng rơi rụng đầy đường.', order: 3 },
    { word: 'mùa đông', meaning: 'mùa lạnh nhất trong năm, cây trụi lá', example: 'Mùa đông miền Bắc lạnh và có gió bấc.', order: 4 },
    { word: 'sông', meaning: 'dòng nước chảy tự nhiên, thường dài và rộng', example: 'Sông Hồng chảy qua Hà Nội.', order: 5 },
    { word: 'núi', meaning: 'khối đất đá cao nổi lên trên mặt đất', example: 'Núi Bà Đen ở Tây Ninh rất đẹp.', order: 6 },
    { word: 'biển', meaning: 'vùng nước mặn rộng lớn bao quanh các lục địa', example: 'Biển Đà Nẵng xanh trong và sạch đẹp.', order: 7 },
    { word: 'đồng lúa', meaning: 'cánh đồng trồng lúa, thường thấy ở nông thôn', example: 'Đồng lúa chín vàng trải dài đến tận chân trời.', order: 8 },
    { word: 'rừng', meaning: 'vùng đất rộng lớn có nhiều cây mọc dày', example: 'Rừng nguyên sinh cần được bảo vệ.', order: 9 },
    { word: 'suối', meaning: 'dòng nước nhỏ chảy tự nhiên từ nguồn trên cao xuống', example: 'Nước suối trong vắt và mát lạnh.', order: 10 },
  ]);

  // ── Ngữ pháp: Từ loại cơ bản ──────────────────────────────────────────────
  const s3_3 = await upsertSet({
    id: `${G}-tu-loai`, title: 'Ngữ pháp — Từ chỉ sự vật, hoạt động, đặc điểm',
    description: 'Nhận biết và phân loại từ chỉ sự vật, hoạt động, đặc điểm',
    category: 'NGU_PHAP', grade: 3, level: 'co_ban', lessonType: 'ngu_phap', createdBy: adminId,
  });
  await upsertItems(s3_3.id, [
    { word: 'Từ chỉ sự vật (danh từ)', meaning: 'Từ dùng để gọi tên người, con vật, đồ vật, hiện tượng', example: 'bàn, ghế, học sinh, con mèo, mưa, gió', order: 1 },
    { word: 'Từ chỉ hoạt động (động từ)', meaning: 'Từ dùng để chỉ hành động hoặc trạng thái của người, vật', example: 'chạy, nhảy, học, ngủ, ăn, hát, yêu', order: 2 },
    { word: 'Từ chỉ đặc điểm (tính từ)', meaning: 'Từ dùng để miêu tả tính chất, màu sắc, hình dáng, kích thước', example: 'đẹp, xấu, cao, thấp, đỏ, vui, buồn', order: 3 },
    { word: 'So sánh', meaning: 'Dùng từ "như", "tựa như", "giống như" để đối chiếu hai sự vật', example: 'Trăng tròn như cái đĩa. / Em nhanh như sóc.', order: 4 },
    { word: 'Nhân hóa', meaning: 'Gán cho vật, con vật những tính chất hoặc hành động như người', example: 'Chú mèo đang mơ màng nhìn trời.', order: 5 },
  ]);

  // ── Thành ngữ lớp 3 ────────────────────────────────────────────────────────
  const s3_4 = await upsertSet({
    id: `${G}-thanh-ngu`, title: 'Thành ngữ — Lớp 3',
    description: 'Các thành ngữ thông dụng trong chương trình Tiếng Việt lớp 3',
    category: 'THANH_NGU', grade: 3, level: 'co_ban', lessonType: 'thanh_ngu', createdBy: adminId,
  });
  await upsertItems(s3_4.id, [
    { word: 'Tay làm hàm nhai, tay quai miệng trễ', meaning: 'Ai lao động chăm chỉ thì có ăn, ai lười biếng thì đói khổ', example: 'Muốn có cơm ăn, áo mặc thì phải chịu khó làm việc: tay làm hàm nhai.', order: 1 },
    { word: 'Có công mài sắt, có ngày nên kim', meaning: 'Kiên trì, chăm chỉ thì dù khó khăn đến đâu cũng thành công', example: 'Bạn Minh tập viết mỗi ngày, cuối cùng viết rất đẹp. Có công mài sắt, có ngày nên kim.', order: 2 },
    { word: 'Học ăn, học nói, học gói, học mở', meaning: 'Mọi việc trong cuộc sống đều cần học hỏi và rèn luyện', example: 'Từ cách ăn uống đến cách nói năng đều cần học: học ăn, học nói, học gói, học mở.', order: 3 },
    { word: 'Anh em như thể chân tay', meaning: 'Anh chị em trong gia đình gắn bó, không thể tách rời', example: 'Anh em phải yêu thương, đùm bọc nhau vì anh em như thể chân tay.', order: 4 },
    { word: 'Thương người như thể thương thân', meaning: 'Hãy yêu thương người khác như yêu thương chính mình', example: 'Em giúp bạn bị té vì em biết thương người như thể thương thân.', order: 5 },
    { word: 'Lời nói chẳng mất tiền mua', meaning: 'Nói năng lịch sự, tử tế không tốn gì mà lại có ích', example: 'Hãy nói năng lễ phép, vì lời nói chẳng mất tiền mua.', order: 6 },
    { word: 'Đất lành chim đậu', meaning: 'Nơi nào tốt, an toàn thì người tài và người hiền tìm đến', example: 'Nhiều người đến định cư ở vùng này vì đất lành chim đậu.', order: 7 },
    { word: 'Bầu ơi thương lấy bí cùng', meaning: 'Những người cùng hoàn cảnh, cùng dân tộc cần đùm bọc nhau', example: 'Người Việt xa xứ luôn giúp đỡ nhau vì bầu ơi thương lấy bí cùng.', order: 8 },
  ]);

  // ── Bài tập Từ loại lớp 3 ─────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-tu-loai`, title: 'Bài tập — Phân loại từ',
    description: 'Xác định từ chỉ sự vật, hoạt động, đặc điểm',
    type: 'MULTIPLE_CHOICE', category: 'NGU_PHAP', grade: 3, level: 'co_ban', timeLimit: 540,
    setId: s3_3.id, createdBy: adminId,
    questions: [
      { content: 'Từ nào là từ chỉ sự vật trong các từ sau?', options: ['bàn ghế', 'chạy nhảy', 'xinh đẹp', 'yêu quý'], answer: 'bàn ghế', explanation: '"bàn ghế" là tên gọi đồ vật → từ chỉ sự vật. "chạy nhảy" chỉ hoạt động, "xinh đẹp" chỉ đặc điểm.', order: 1 },
      { content: 'Từ nào là từ chỉ hoạt động?', options: ['học bài', 'quyển sách', 'cao to', 'mặt trời'], answer: 'học bài', explanation: '"học bài" chỉ hành động học tập → từ chỉ hoạt động.', order: 2 },
      { content: 'Từ nào là từ chỉ đặc điểm?', options: ['trong sáng', 'con chó', 'đi học', 'ngôi nhà'], answer: 'trong sáng', explanation: '"trong sáng" miêu tả tính chất → từ chỉ đặc điểm.', order: 3 },
      { content: 'Câu "Bông hoa đẹp như viên ngọc." sử dụng biện pháp tu từ gì?', options: ['So sánh', 'Nhân hóa', 'Điệp từ', 'Ẩn dụ'], answer: 'So sánh', explanation: 'Câu dùng từ "như" để so sánh bông hoa với viên ngọc → biện pháp so sánh.', order: 4 },
      { content: 'Câu "Chú mèo đang nghĩ ngợi điều gì đó." sử dụng biện pháp tu từ gì?', options: ['Nhân hóa', 'So sánh', 'Điệp từ', 'Liệt kê'], answer: 'Nhân hóa', explanation: '"Nghĩ ngợi" là hoạt động của người, gán cho con mèo → biện pháp nhân hóa.', order: 5 },
    ],
  });

  // ── Đọc hiểu lớp 3 ────────────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-doc-hieu-1`, title: 'Đọc hiểu — Người thợ rèn',
    type: 'READING', category: 'TAP_DOC', grade: 3, level: 'co_ban', timeLimit: 660,
    createdBy: adminId,
    passage: `Người thợ rèn

Bác thợ rèn làm việc từ sáng sớm đến chiều tối. Mỗi buổi sáng, bác thắp lò than đỏ rực, rồi đặt thanh sắt vào lò nung cho nóng đỏ. Khi sắt đã đỏ rực, bác dùng búa đập mạnh, từng tiếng "cốc, cốc" vang lên đều đặn. Mồ hôi bác ướt đầm áo, nhưng khuôn mặt bác vẫn rạng rỡ, tươi vui. Bác bảo: "Lao động là niềm vui. Mỗi chiếc lưỡi cày, mỗi con dao bác làm ra là bác góp phần cho bà con nông dân có công cụ sản xuất." Nhìn những sản phẩm của mình, bác mỉm cười thỏa mãn.`,
    questions: [
      { content: 'Bác thợ rèn bắt đầu làm việc khi nào?', options: ['Từ sáng sớm', 'Từ giữa trưa', 'Từ buổi chiều', 'Từ buổi tối'], answer: 'Từ sáng sớm', explanation: '"Bác thợ rèn làm việc từ sáng sớm đến chiều tối."', order: 1 },
      { content: 'Bác thợ rèn dùng công cụ gì để đập sắt?', options: ['Búa', 'Kìm', 'Đục', 'Cưa'], answer: 'Búa', explanation: '"bác dùng búa đập mạnh, từng tiếng \'cốc, cốc\' vang lên"', order: 2 },
      { content: 'Theo bác thợ rèn, lao động là gì?', options: ['Niềm vui', 'Gánh nặng', 'Bổn phận', 'Khổ sở'], answer: 'Niềm vui', explanation: '"Bác bảo: Lao động là niềm vui."', order: 3 },
      { content: 'Những sản phẩm bác thợ rèn làm ra dùng để làm gì?', options: ['Phục vụ sản xuất nông nghiệp', 'Trang trí nhà cửa', 'Bán ở chợ', 'Dùng trong quân đội'], answer: 'Phục vụ sản xuất nông nghiệp', explanation: '"bà con nông dân có công cụ sản xuất" — lưỡi cày, con dao là công cụ nông nghiệp.', order: 4 },
    ],
  });

  // ── Bài tập Thành ngữ lớp 3 ───────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-thanh-ngu`, title: 'Bài tập — Thành ngữ lớp 3',
    description: 'Hiểu nghĩa và vận dụng thành ngữ',
    type: 'MULTIPLE_CHOICE', category: 'THANH_NGU', grade: 3, level: 'co_ban', timeLimit: 480,
    setId: s3_4.id, createdBy: adminId,
    questions: [
      { content: '"Có công mài sắt, có ngày nên kim" khuyên chúng ta điều gì?', options: ['Kiên trì, chăm chỉ sẽ thành công', 'Làm việc nhanh cho xong', 'Cần có nhiều tiền', 'Chờ đợi cơ hội tốt'], answer: 'Kiên trì, chăm chỉ sẽ thành công', explanation: 'Thành ngữ này dạy: dù khó đến đâu, nếu kiên trì rèn luyện thì sẽ thành công.', order: 1 },
      { content: 'Khi nào ta dùng câu "Thương người như thể thương thân"?', options: ['Khi nhắc nhở mọi người biết yêu thương người khác', 'Khi khen người chăm chỉ', 'Khi nói về sức khỏe', 'Khi nói về học tập'], answer: 'Khi nhắc nhở mọi người biết yêu thương người khác', explanation: '"Thương người như thể thương thân" — hãy yêu người khác như yêu chính mình.', order: 2 },
      { content: '"Anh em như thể chân tay" có nghĩa là gì?', options: ['Anh em gắn bó không thể tách rời', 'Anh em hay cãi nhau', 'Anh em giống nhau', 'Anh em ít gặp nhau'], answer: 'Anh em gắn bó không thể tách rời', explanation: 'Chân và tay là hai bộ phận gắn liền với thân thể, không thể thiếu nhau — ví với tình anh em.', order: 3 },
    ],
  });

  console.log('    ✓ Lớp 3 hoàn thành');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 4
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade4(adminId: string) {
  console.log('  📙 Lớp 4...');
  const G = 'kntt-vt-g4';

  // ── Từ vựng: Đức tính tốt đẹp ──────────────────────────────────────────────
  const s4_1 = await upsertSet({
    id: `${G}-duc-tinh`, title: 'Từ vựng — Đức tính tốt đẹp',
    description: 'Từ vựng về nhân ái, trung thực, dũng cảm, chăm chỉ',
    category: 'TU_VUNG', grade: 4, level: 'trung_binh', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s4_1.id, [
    { word: 'nhân ái', meaning: 'có lòng thương người, hay giúp đỡ người khác', example: 'Bác ấy rất nhân ái, hay giúp đỡ người nghèo.', order: 1 },
    { word: 'trung thực', meaning: 'thật thà, không dối trá, nói đúng sự thật', example: 'Trung thực là đức tính quý báu.', order: 2 },
    { word: 'dũng cảm', meaning: 'gan dạ, không sợ hãi trước nguy hiểm', example: 'Anh chiến sĩ dũng cảm bảo vệ Tổ quốc.', order: 3 },
    { word: 'chăm chỉ', meaning: 'siêng năng, làm việc đều đặn không lười biếng', example: 'Bạn ấy chăm chỉ học bài nên được điểm cao.', order: 4 },
    { word: 'khiêm tốn', meaning: 'không tự cao tự đại, biết nhìn nhận ưu điểm của người khác', example: 'Dù giỏi, bạn ấy vẫn rất khiêm tốn.', order: 5 },
    { word: 'kiên trì', meaning: 'bền lòng, không nản chí dù gặp khó khăn', example: 'Nhờ kiên trì luyện tập, em đã đạt giải.', order: 6 },
    { word: 'tự lập', meaning: 'tự mình làm lấy, không phụ thuộc vào người khác', example: 'Học cách tự lập từ nhỏ sẽ có ích khi lớn.', order: 7 },
    { word: 'vị tha', meaning: 'rộng lượng, biết tha thứ lỗi lầm của người khác', example: 'Người vị tha được mọi người yêu quý.', order: 8 },
    { word: 'trách nhiệm', meaning: 'bổn phận phải làm tốt và gánh chịu hậu quả từ việc mình làm', example: 'Học sinh có trách nhiệm học bài và làm bài đầy đủ.', order: 9 },
    { word: 'hào phóng', meaning: 'rộng rãi trong việc cho, tặng, không tính toán', example: 'Bác ấy hào phóng giúp đỡ người nghèo.', order: 10 },
  ]);

  // ── Ngữ pháp: Danh từ, Động từ, Tính từ ─────────────────────────────────
  const s4_2 = await upsertSet({
    id: `${G}-danh-dong-tinh`, title: 'Ngữ pháp — Danh từ, Động từ, Tính từ',
    description: 'Khái niệm và nhận biết danh từ, động từ, tính từ trong câu',
    category: 'NGU_PHAP', grade: 4, level: 'trung_binh', lessonType: 'ngu_phap', createdBy: adminId,
  });
  await upsertItems(s4_2.id, [
    { word: 'Danh từ', meaning: 'Từ dùng để chỉ người, vật, hiện tượng, khái niệm. Thường đứng sau "những, các, một, hai…"', example: 'học sinh, quyển sách, tình yêu, Hà Nội, Việt Nam', note: 'Danh từ riêng (tên người, địa danh) viết hoa chữ cái đầu', order: 1 },
    { word: 'Động từ', meaning: 'Từ chỉ hoạt động, trạng thái. Thường đứng sau "đang, đã, sẽ, chưa, không"', example: 'chạy, nhảy, học, yêu, nghĩ, ngủ, mọc', note: 'Câu luôn cần có động từ ở vị ngữ', order: 2 },
    { word: 'Tính từ', meaning: 'Từ chỉ đặc điểm, tính chất của người hoặc vật. Đứng sau "rất, quá, lắm"', example: 'đẹp, cao, nhanh, thông minh, xanh, nóng, lạnh', note: 'Tính từ thường đứng sau danh từ hoặc sau động từ "là"', order: 3 },
    { word: 'Câu kể', meaning: 'Câu dùng để kể, tả, giới thiệu về người hoặc sự việc. Kết thúc bằng dấu chấm (.)', example: 'Em đi học. / Bầu trời hôm nay trong xanh.', order: 4 },
    { word: 'Câu hỏi', meaning: 'Câu dùng để hỏi, yêu cầu trả lời. Kết thúc bằng dấu hỏi (?)', example: 'Em tên gì? / Hôm nay trời như thế nào?', order: 5 },
    { word: 'Câu cảm', meaning: 'Câu bộc lộ cảm xúc vui, buồn, ngạc nhiên… Kết thúc bằng dấu chấm than (!)', example: 'Ôi, đẹp quá! / Chà, nhanh thật!', order: 6 },
    { word: 'Câu khiến', meaning: 'Câu dùng để yêu cầu, đề nghị, nhờ vả. Thường có "hãy, đừng, xin, mời…"', example: 'Hãy giữ trật tự! / Xin mời vào!', order: 7 },
  ]);

  // ── Tục ngữ lớp 4 ─────────────────────────────────────────────────────────
  const s4_3 = await upsertSet({
    id: `${G}-tuc-ngu`, title: 'Tục ngữ — Lớp 4',
    description: 'Các câu tục ngữ trong chương trình Tiếng Việt lớp 4',
    category: 'TUC_NGU', grade: 4, level: 'trung_binh', lessonType: 'tuc_ngu', createdBy: adminId,
  });
  await upsertItems(s4_3.id, [
    { word: 'Uống nước nhớ nguồn', meaning: 'Hưởng thành quả phải biết ơn người tạo ra nó', example: 'Ngày 20/11 là dịp để học sinh thể hiện lòng biết ơn thầy cô — uống nước nhớ nguồn.', order: 1 },
    { word: 'Ăn quả nhớ kẻ trồng cây', meaning: 'Được hưởng điều gì phải nhớ ơn người tạo ra', example: 'Chúng ta phải biết ơn các anh hùng đã hi sinh — ăn quả nhớ kẻ trồng cây.', order: 2 },
    { word: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao', meaning: 'Đoàn kết tập thể mạnh hơn cá nhân', example: 'Cả lớp cùng nhau dọn dẹp thì xong nhanh — ba cây chụm lại nên hòn núi cao.', order: 3 },
    { word: 'Chớ thấy sóng cả mà ngã tay chèo', meaning: 'Không nên nản lòng trước khó khăn', example: 'Bài toán khó mấy cũng đừng bỏ cuộc, chớ thấy sóng cả mà ngã tay chèo.', order: 4 },
    { word: 'Không thầy đố mày làm nên', meaning: 'Thầy cô có vai trò rất quan trọng trong việc dạy dỗ học trò', example: 'Em luôn kính trọng thầy cô vì không thầy đố mày làm nên.', order: 5 },
    { word: 'Học thầy không tày học bạn', meaning: 'Học từ bạn bè đôi khi cũng có ích như học từ thầy', example: 'Học nhóm với bạn cũng rất tốt — học thầy không tày học bạn.', order: 6 },
    { word: 'Người ta là hoa đất', meaning: 'Con người là tinh hoa, là sản phẩm quý giá nhất của đất trời', example: 'Hãy trân trọng mỗi con người vì người ta là hoa đất.', order: 7 },
    { word: 'Cái nết đánh chết cái đẹp', meaning: 'Phẩm hạnh, nết na quan trọng hơn vẻ đẹp bên ngoài', example: 'Bạn tuy không đẹp nhưng hiền lành, chăm chỉ — cái nết đánh chết cái đẹp.', order: 8 },
    { word: 'Đi một ngày đàng học một sàng khôn', meaning: 'Ra ngoài học hỏi sẽ mở mang trí tuệ', example: 'Chuyến dã ngoại giúp em hiểu thêm nhiều điều — đi một ngày đàng học một sàng khôn.', order: 9 },
    { word: 'Lửa thử vàng, gian nan thử sức', meaning: 'Khó khăn là thử thách để biết ai thực sự có năng lực', example: 'Vượt qua kỳ thi khó mới biết mình học được gì — lửa thử vàng, gian nan thử sức.', order: 10 },
  ]);

  // ── Bài tập Ngữ pháp lớp 4 ────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-ngu-phap`, title: 'Bài tập — Danh từ, Động từ, Tính từ',
    type: 'MULTIPLE_CHOICE', category: 'NGU_PHAP', grade: 4, level: 'trung_binh', timeLimit: 540,
    setId: s4_2.id, createdBy: adminId,
    questions: [
      { content: 'Từ nào là danh từ trong câu "Những bông hoa hồng nở rực rỡ"?', options: ['hoa hồng', 'nở', 'rực rỡ', 'những'], answer: 'hoa hồng', explanation: '"hoa hồng" là tên gọi sự vật → danh từ. "nở" là động từ, "rực rỡ" là tính từ.', order: 1 },
      { content: 'Câu nào là câu cảm?', options: ['Ồ, bông hoa đẹp quá!', 'Bông hoa đẹp.', 'Bông hoa đẹp không?', 'Hãy nhìn bông hoa!'], answer: 'Ồ, bông hoa đẹp quá!', explanation: 'Câu cảm bộc lộ cảm xúc, kết thúc bằng dấu (!). "Ồ, bông hoa đẹp quá!" bộc lộ sự ngạc nhiên.', order: 2 },
      { content: 'Câu nào là câu khiến?', options: ['Hãy giữ trật tự trong lớp!', 'Lớp học rất trật tự.', 'Lớp học trật tự không?', 'Lớp học này rất yên tĩnh!'], answer: 'Hãy giữ trật tự trong lớp!', explanation: 'Câu khiến có từ "hãy" để yêu cầu. "Hãy giữ trật tự trong lớp!" là lời đề nghị.', order: 3 },
      { content: 'Từ "thông minh" thuộc loại từ gì?', options: ['Tính từ', 'Danh từ', 'Động từ', 'Đại từ'], answer: 'Tính từ', explanation: '"thông minh" chỉ đặc điểm của người → tính từ.', order: 4 },
      { content: 'Tìm động từ trong câu "Em đang chăm chú đọc sách trong thư viện."', options: ['đọc', 'chăm chú', 'sách', 'thư viện'], answer: 'đọc', explanation: '"đọc" là hành động → động từ. "chăm chú" là tính từ (đặc điểm), "sách" và "thư viện" là danh từ.', order: 5 },
    ],
  });

  // ── Bài tập Tục ngữ lớp 4 ─────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-tuc-ngu`, title: 'Bài tập — Tục ngữ lớp 4',
    type: 'MULTIPLE_CHOICE', category: 'TUC_NGU', grade: 4, level: 'trung_binh', timeLimit: 480,
    setId: s4_3.id, createdBy: adminId,
    questions: [
      { content: '"Uống nước nhớ nguồn" có nghĩa là gì?', options: ['Phải biết ơn người tạo ra thành quả mình hưởng', 'Uống nước lọc tốt cho sức khỏe', 'Nhớ mang nước khi đi xa', 'Tiết kiệm nước sạch'], answer: 'Phải biết ơn người tạo ra thành quả mình hưởng', explanation: '"Nguồn" là nơi phát sinh dòng nước — ẩn dụ cho người đã tạo ra điều kiện ta đang hưởng.', order: 1 },
      { content: 'Câu tục ngữ nào khuyên chúng ta đoàn kết?', options: ['Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao', 'Uống nước nhớ nguồn', 'Cái nết đánh chết cái đẹp', 'Đi một ngày đàng học một sàng khôn'], answer: 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao', explanation: 'Câu này so sánh sức mạnh tập thể (nhiều cây) với cá nhân (một cây) → khuyên đoàn kết.', order: 2 },
      { content: '"Lửa thử vàng, gian nan thử sức" dạy chúng ta điều gì?', options: ['Khó khăn là thử thách để rèn luyện bản thân', 'Không nên làm việc khó', 'Lửa rất nguy hiểm', 'Vàng rất quý giá'], answer: 'Khó khăn là thử thách để rèn luyện bản thân', explanation: 'Như lửa thử xem vàng có thật không, gian nan thử xem người có thực sự mạnh mẽ không.', order: 3 },
    ],
  });

  // ── Đọc hiểu lớp 4 ────────────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-doc-hieu-1`, title: 'Đọc hiểu — Ước mơ của tương lai',
    type: 'READING', category: 'TAP_DOC', grade: 4, level: 'trung_binh', timeLimit: 720,
    createdBy: adminId,
    passage: `Ước mơ của tương lai

Minh là cậu bé lớn lên ở miền quê nghèo. Nhà Minh rất khó khăn, nhưng em luôn nuôi ước mơ trở thành bác sĩ để chữa bệnh cho bà con trong làng. Mỗi buổi tối, dưới ánh đèn dầu leo lét, Minh miệt mài học bài. Có lúc mệt mỏi, muốn bỏ cuộc, nhưng nhớ đến lời mẹ dặn "Con ơi, chớ thấy sóng cả mà ngã tay chèo", em lại cố gắng vươn lên.

Năm lớp 4, Minh đạt học sinh giỏi toàn trường. Thầy hiệu trưởng khen: "Em là tấm gương sáng về lòng kiên trì và ý chí vươn lên." Minh mỉm cười, trong lòng thầm hứa sẽ cố gắng hơn nữa để biến ước mơ thành hiện thực.`,
    questions: [
      { content: 'Minh có ước mơ gì?', options: ['Trở thành bác sĩ', 'Trở thành giáo viên', 'Làm nông nghiệp', 'Đi du học'], answer: 'Trở thành bác sĩ', explanation: '"em luôn nuôi ước mơ trở thành bác sĩ để chữa bệnh cho bà con trong làng"', order: 1 },
      { content: 'Minh học bài dưới ánh sáng gì?', options: ['Ánh đèn dầu', 'Ánh đèn điện', 'Ánh nến', 'Ánh đèn pin'], answer: 'Ánh đèn dầu', explanation: '"dưới ánh đèn dầu leo lét, Minh miệt mài học bài"', order: 2 },
      { content: 'Câu tục ngữ mẹ dặn Minh có nghĩa là gì?', options: ['Không nản lòng trước khó khăn', 'Cẩn thận khi đi biển', 'Học cách bơi lội', 'Tránh nguy hiểm'], answer: 'Không nản lòng trước khó khăn', explanation: '"Chớ thấy sóng cả mà ngã tay chèo" — không bỏ cuộc khi gặp khó khăn.', order: 3 },
      { content: 'Kết quả học tập của Minh ở lớp 4 như thế nào?', options: ['Học sinh giỏi toàn trường', 'Học sinh tiên tiến', 'Học sinh trung bình', 'Bị ở lại lớp'], answer: 'Học sinh giỏi toàn trường', explanation: '"Năm lớp 4, Minh đạt học sinh giỏi toàn trường."', order: 4 },
      { content: 'Thầy hiệu trưởng khen Minh về điều gì?', options: ['Lòng kiên trì và ý chí vươn lên', 'Kết quả thi toán', 'Viết chữ đẹp', 'Tham gia thể thao'], answer: 'Lòng kiên trì và ý chí vươn lên', explanation: '"Em là tấm gương sáng về lòng kiên trì và ý chí vươn lên."', order: 5 },
    ],
  });

  console.log('    ✓ Lớp 4 hoàn thành');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 5
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade5(adminId: string) {
  console.log('  📕 Lớp 5...');
  const G = 'kntt-vt-g5';

  // ── Từ vựng: Tổ quốc và hòa bình ─────────────────────────────────────────
  const s5_1 = await upsertSet({
    id: `${G}-to-quoc`, title: 'Từ vựng — Tổ quốc và hòa bình',
    description: 'Từ vựng về đất nước, dân tộc, lịch sử, hòa bình',
    category: 'TU_VUNG', grade: 5, level: 'nang_cao', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s5_1.id, [
    { word: 'độc lập', meaning: 'tự chủ, không bị nước khác cai trị hay can thiệp', example: 'Ngày 2/9/1945 là ngày Việt Nam tuyên bố độc lập.', order: 1 },
    { word: 'tự do', meaning: 'được làm theo ý muốn, không bị ràng buộc hay áp bức', example: 'Tự do là quyền cơ bản của mỗi con người.', order: 2 },
    { word: 'hòa bình', meaning: 'trạng thái không có chiến tranh, cuộc sống yên ổn', example: 'Nhân dân Việt Nam yêu chuộng hòa bình.', order: 3 },
    { word: 'hi sinh', meaning: 'chấp nhận mất mát, thậm chí mất cả tính mạng vì mục đích cao cả', example: 'Các anh hùng đã hi sinh vì độc lập của Tổ quốc.', order: 4 },
    { word: 'chủ quyền', meaning: 'quyền tự quyết của một quốc gia trên lãnh thổ của mình', example: 'Việt Nam có đầy đủ chủ quyền trên đất liền và biển đảo.', order: 5 },
    { word: 'bảo vệ Tổ quốc', meaning: 'giữ gìn đất nước, chống lại kẻ xâm lược', example: 'Bảo vệ Tổ quốc là nghĩa vụ thiêng liêng của mỗi người dân.', order: 6 },
    { word: 'văn hóa dân tộc', meaning: 'toàn bộ phong tục, tập quán, nghệ thuật, ngôn ngữ của một dân tộc', example: 'Áo dài là biểu tượng của văn hóa dân tộc Việt Nam.', order: 7 },
    { word: 'di sản', meaning: 'những giá trị văn hóa, lịch sử được truyền lại từ thế hệ trước', example: 'Vịnh Hạ Long là di sản thiên nhiên thế giới.', order: 8 },
    { word: 'kế thừa', meaning: 'nhận lấy và phát huy những giá trị từ thế hệ trước', example: 'Thế hệ trẻ cần kế thừa truyền thống tốt đẹp của cha ông.', order: 9 },
    { word: 'giao lưu văn hóa', meaning: 'trao đổi, học hỏi văn hóa giữa các dân tộc, quốc gia', example: 'Giao lưu văn hóa giúp tăng cường tình hữu nghị giữa các nước.', order: 10 },
  ]);

  // ── Từ vựng: Thiên nhiên và môi trường ───────────────────────────────────
  const s5_2 = await upsertSet({
    id: `${G}-moi-truong`, title: 'Từ vựng — Thiên nhiên và bảo vệ môi trường',
    description: 'Từ vựng về bảo vệ môi trường, thiên nhiên, sinh thái',
    category: 'TU_VUNG', grade: 5, level: 'nang_cao', lessonType: 'tu_vung', createdBy: adminId,
  });
  await upsertItems(s5_2.id, [
    { word: 'môi trường', meaning: 'toàn bộ các yếu tố tự nhiên và xã hội xung quanh con người', example: 'Bảo vệ môi trường là trách nhiệm của tất cả mọi người.', order: 1 },
    { word: 'ô nhiễm', meaning: 'trạng thái môi trường bị bẩn, độc hại do chất thải', example: 'Ô nhiễm không khí ảnh hưởng đến sức khỏe con người.', order: 2 },
    { word: 'rừng nhiệt đới', meaning: 'rừng ở vùng khí hậu nhiệt đới, có nhiều loài cây và động vật', example: 'Rừng nhiệt đới Amazôn được gọi là "lá phổi" của Trái Đất.', order: 3 },
    { word: 'đa dạng sinh học', meaning: 'sự phong phú của các loài sinh vật sống trên Trái Đất', example: 'Đa dạng sinh học giúp duy trì cân bằng hệ sinh thái.', order: 4 },
    { word: 'tái chế', meaning: 'xử lý rác thải để tạo ra vật liệu mới sử dụng được', example: 'Tái chế giấy, nhựa giúp giảm lượng rác thải.', order: 5 },
    { word: 'năng lượng tái tạo', meaning: 'nguồn năng lượng từ thiên nhiên không cạn kiệt như gió, mặt trời', example: 'Điện mặt trời là nguồn năng lượng tái tạo sạch và rẻ.', order: 6 },
    { word: 'biến đổi khí hậu', meaning: 'sự thay đổi lâu dài của nhiệt độ và thời tiết trên Trái Đất', example: 'Biến đổi khí hậu gây ra nhiều thiên tai nghiêm trọng.', order: 7 },
    { word: 'bền vững', meaning: 'duy trì được lâu dài, không gây hại cho thế hệ tương lai', example: 'Phát triển bền vững là mục tiêu của các quốc gia.', order: 8 },
  ]);

  // ── Ngữ pháp: Câu ghép và dấu câu ───────────────────────────────────────
  const s5_3 = await upsertSet({
    id: `${G}-cau-ghep`, title: 'Ngữ pháp — Câu ghép và dấu câu',
    description: 'Nhận biết câu ghép, từ nối, và cách dùng dấu câu',
    category: 'NGU_PHAP', grade: 5, level: 'nang_cao', lessonType: 'ngu_phap', createdBy: adminId,
  });
  await upsertItems(s5_3.id, [
    { word: 'Câu đơn', meaning: 'Câu chỉ có một chủ ngữ và một vị ngữ', example: 'Em học bài.', order: 1 },
    { word: 'Câu ghép', meaning: 'Câu có hai hoặc nhiều vế câu nối với nhau bằng từ nối', example: 'Trời mưa to nên chúng em không ra ngoài chơi.', order: 2 },
    { word: 'Từ nối quan hệ nguyên nhân - kết quả', meaning: 'vì…nên, do…nên, nhờ…mà, tại…nên', example: 'Vì trời mưa nên em mặc áo mưa.', order: 3 },
    { word: 'Từ nối quan hệ điều kiện - kết quả', meaning: 'nếu…thì, hễ…thì', example: 'Nếu em học chăm thì em sẽ đạt điểm cao.', order: 4 },
    { word: 'Từ nối quan hệ tương phản', meaning: 'tuy…nhưng, dù…nhưng, mặc dù…vẫn', example: 'Tuy trời lạnh nhưng em vẫn đi học.', order: 5 },
    { word: 'Dấu phẩy (,)', meaning: 'Ngăn cách các thành phần trong câu, các vế trong câu ghép', example: 'Em học Toán, Tiếng Việt và Khoa học.', order: 6 },
    { word: 'Dấu chấm phẩy (;)', meaning: 'Ngăn cách các vế câu ghép có quan hệ bình đẳng, độc lập', example: 'Mùa xuân hoa nở; mùa hè ve kêu.', order: 7 },
    { word: 'Dấu hai chấm (:)', meaning: 'Báo hiệu phần giải thích hoặc lời dẫn trực tiếp', example: 'Mẹ nói: "Con học bài đi!"', order: 8 },
  ]);

  // ── Ca dao lớp 5 ──────────────────────────────────────────────────────────
  const s5_4 = await upsertSet({
    id: `${G}-ca-dao`, title: 'Ca dao — Lớp 5',
    description: 'Ca dao về quê hương, đất nước, tình cảm gia đình',
    category: 'CA_DAO', grade: 5, level: 'nang_cao', lessonType: 'ca_dao', createdBy: adminId,
  });
  await upsertItems(s5_4.id, [
    {
      word: 'Công cha như núi Thái Sơn\nNghĩa mẹ như nước trong nguồn chảy ra',
      meaning: 'Công lao của cha to lớn như núi, nghĩa của mẹ vô tận như nguồn nước không bao giờ cạn',
      example: 'Bài ca dao nhắc nhở con cái phải biết ơn và hiếu thảo với cha mẹ.',
      note: 'Núi Thái Sơn là ngọn núi cao nổi tiếng của Trung Quốc, dùng để ví với sự vĩ đại',
      order: 1,
    },
    {
      word: 'Quê hương là chùm khế ngọt\nCho con trèo hái mỗi ngày',
      meaning: 'Quê hương gần gũi, thân thương, nuôi dưỡng ta từ thuở ấu thơ',
      example: 'Ca dao gợi hình ảnh quê hương gắn với ký ức tuổi thơ bình dị.',
      order: 2,
    },
    {
      word: 'Nhiễu điều phủ lấy giá gương\nNgười trong một nước phải thương nhau cùng',
      meaning: 'Những người cùng dân tộc, cùng đất nước phải biết yêu thương, đùm bọc nhau',
      example: 'Ca dao nhắc nhở tinh thần đoàn kết, yêu thương đồng bào.',
      order: 3,
    },
    {
      word: 'Bầu ơi thương lấy bí cùng\nTuy rằng khác giống nhưng chung một giàn',
      meaning: 'Dù khác nhau nhưng cùng sống trên một mảnh đất thì phải yêu thương, giúp đỡ nhau',
      example: 'Hình ảnh bầu bí trên cùng một giàn ví với các dân tộc sống trên đất Việt Nam.',
      order: 4,
    },
    {
      word: 'Đất nước tôi thon thả giọt đàn bầu\nQuê hương tôi từ thuở tôi còn nhỏ',
      meaning: 'Tình yêu quê hương gắn bó từ thời thơ ấu, quê hương hiện lên qua âm thanh của đàn bầu',
      example: 'Lời ca gợi hình ảnh quê hương Việt Nam qua nhạc cụ truyền thống.',
      order: 5,
    },
  ]);

  // ── Văn học: Thơ và truyện ngắn ──────────────────────────────────────────
  const s5_5 = await upsertSet({
    id: `${G}-van-hoc`, title: 'Văn học — Các thể loại và đặc điểm',
    description: 'Nhận biết và phân tích thơ, truyện ngắn, ký, tản văn',
    category: 'VAN_HOC', grade: 5, level: 'nang_cao', lessonType: 'van_hoc', createdBy: adminId,
  });
  await upsertItems(s5_5.id, [
    { word: 'Thơ', meaning: 'Thể loại văn học sử dụng ngôn ngữ có nhịp điệu, vần điệu để bộc lộ cảm xúc', example: 'Thơ "Đất nước" của Nguyễn Đình Thi có nhịp điệu tha thiết.', order: 1 },
    { word: 'Truyện ngắn', meaning: 'Tác phẩm văn xuôi ngắn, có cốt truyện, nhân vật và tình huống', example: '"Dế Mèn phiêu lưu ký" của Tô Hoài là truyện dài nổi tiếng cho thiếu nhi.', order: 2 },
    { word: 'Nhân vật', meaning: 'Người hoặc vật được tác giả xây dựng trong tác phẩm', example: 'Nhân vật Dế Mèn tượng trưng cho tuổi trẻ dũng cảm nhưng còn kiêu ngạo.', order: 3 },
    { word: 'Cốt truyện', meaning: 'Chuỗi sự kiện chính xảy ra trong truyện theo trình tự nhất định', example: 'Cốt truyện của "Cô bé bán diêm" xoay quanh đêm giao thừa lạnh giá.', order: 4 },
    { word: 'Chủ đề', meaning: 'Tư tưởng, thông điệp chính mà tác giả muốn truyền đạt', example: 'Chủ đề của bài "Người thợ rèn" là ca ngợi lao động chân chính.', order: 5 },
    { word: 'Hình ảnh', meaning: 'Cách diễn đạt gợi lên hình dung về sự vật, con người trong văn học', example: '"Mặt trời như quả cầu lửa" là hình ảnh so sánh đặc sắc.', order: 6 },
  ]);

  // ── Bài tập Câu ghép lớp 5 ────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-cau-ghep`, title: 'Bài tập — Câu ghép và từ nối',
    type: 'MULTIPLE_CHOICE', category: 'NGU_PHAP', grade: 5, level: 'nang_cao', timeLimit: 600,
    setId: s5_3.id, createdBy: adminId,
    questions: [
      { content: 'Câu "Vì trời mưa to nên em không ra ngoài chơi." thuộc kiểu câu ghép nào?', options: ['Nguyên nhân - kết quả', 'Điều kiện - kết quả', 'Tương phản', 'Bổ sung'], answer: 'Nguyên nhân - kết quả', explanation: 'Cặp từ "vì…nên" chỉ nguyên nhân (mưa to) dẫn đến kết quả (không ra ngoài).', order: 1 },
      { content: 'Điền từ nối thích hợp: "___ học chăm chỉ ___ em sẽ đạt kết quả tốt."', options: ['Nếu…thì', 'Vì…nên', 'Tuy…nhưng', 'Do…mà'], answer: 'Nếu…thì', explanation: 'Cặp từ "Nếu…thì" diễn tả quan hệ điều kiện - kết quả.', order: 2 },
      { content: 'Câu "Tuy nhà xa nhưng bạn ấy không bao giờ đi học muộn." thể hiện quan hệ gì?', options: ['Tương phản', 'Nguyên nhân - kết quả', 'Điều kiện - kết quả', 'Bổ sung'], answer: 'Tương phản', explanation: '"Tuy…nhưng" chỉ sự tương phản: dù nhà xa (tưởng sẽ muộn) nhưng không muộn.', order: 3 },
      { content: 'Dấu câu nào dùng để báo hiệu lời dẫn trực tiếp?', options: ['Dấu hai chấm (:)', 'Dấu phẩy (,)', 'Dấu chấm phẩy (;)', 'Dấu gạch ngang (—)'], answer: 'Dấu hai chấm (:)', explanation: 'Dấu hai chấm (:) báo hiệu phần giải thích hoặc lời dẫn trực tiếp theo sau.', order: 4 },
      { content: 'Câu nào là câu ghép?', options: ['Mùa xuân hoa nở rực rỡ, chim hót véo von.', 'Em học bài chăm chỉ.', 'Bầu trời xanh trong.', 'Mẹ đi chợ.'], answer: 'Mùa xuân hoa nở rực rỡ, chim hót véo von.', explanation: 'Câu này có hai vế (hoa nở / chim hót) được nối bằng dấu phẩy → câu ghép.', order: 5 },
    ],
  });

  // ── Bài tập Ca dao lớp 5 ──────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-bt-ca-dao`, title: 'Bài tập — Ca dao lớp 5',
    type: 'MULTIPLE_CHOICE', category: 'CA_DAO', grade: 5, level: 'nang_cao', timeLimit: 480,
    setId: s5_4.id, createdBy: adminId,
    questions: [
      { content: '"Công cha như núi Thái Sơn / Nghĩa mẹ như nước trong nguồn chảy ra" sử dụng biện pháp tu từ gì?', options: ['So sánh', 'Nhân hóa', 'Ẩn dụ', 'Điệp từ'], answer: 'So sánh', explanation: 'Câu dùng từ "như" để so sánh: công cha với núi Thái Sơn, nghĩa mẹ với nước nguồn.', order: 1 },
      { content: 'Bài ca dao "Quê hương là chùm khế ngọt" thể hiện tình cảm gì?', options: ['Tình yêu quê hương', 'Tình anh em', 'Lòng biết ơn thầy cô', 'Tình bạn bè'], answer: 'Tình yêu quê hương', explanation: 'Hình ảnh chùm khế ngọt gợi ký ức tuổi thơ gắn bó với quê hương.', order: 2 },
      { content: '"Nhiễu điều phủ lấy giá gương / Người trong một nước phải thương nhau cùng" nhắn nhủ điều gì?', options: ['Đồng bào phải yêu thương đùm bọc nhau', 'Hãy giữ gìn đồ vật cẩn thận', 'Phải làm việc chăm chỉ', 'Cần học giỏi'], answer: 'Đồng bào phải yêu thương đùm bọc nhau', explanation: '"Người trong một nước" là những người cùng đất nước, cần "thương nhau cùng".', order: 3 },
    ],
  });

  // ── Đọc hiểu lớp 5 ────────────────────────────────────────────────────────
  await upsertExercise({
    id: `${G}-doc-hieu-1`, title: 'Đọc hiểu — Rừng phòng hộ',
    type: 'READING', category: 'TAP_DOC', grade: 5, level: 'nang_cao', timeLimit: 780,
    createdBy: adminId,
    passage: `Rừng phòng hộ đầu nguồn

Rừng đầu nguồn có vai trò cực kỳ quan trọng. Những cây rừng như những người lính thầm lặng, ngày đêm bảo vệ nguồn nước và đất đai. Rễ cây bám chặt vào đất, giữ cho đất không bị xói mòn khi mưa lớn. Tán cây xanh tỏa rộng, điều hòa khí hậu, giữ cho không khí mát mẻ và trong lành. Những dòng suối trong vắt bắt nguồn từ rừng đầu nguồn, cung cấp nước cho ruộng đồng phía dưới.

Thế nhưng, nhiều cánh rừng đang bị chặt phá không thương tiếc. Khi rừng mất đi, mưa lớn gây lũ lụt và lở đất, mùa khô thì hạn hán kéo dài. Bảo vệ rừng đầu nguồn chính là bảo vệ cuộc sống của chúng ta và các thế hệ mai sau.`,
    questions: [
      { content: 'Theo bài, rừng đầu nguồn có vai trò như thế nào?', options: ['Cực kỳ quan trọng', 'Không quan trọng', 'Chỉ cung cấp gỗ', 'Chỉ làm đẹp cảnh quan'], answer: 'Cực kỳ quan trọng', explanation: '"Rừng đầu nguồn có vai trò cực kỳ quan trọng."', order: 1 },
      { content: 'Rễ cây trong rừng có tác dụng gì?', options: ['Giữ đất không bị xói mòn', 'Cung cấp oxy', 'Tạo bóng mát', 'Điều hòa khí hậu'], answer: 'Giữ đất không bị xói mòn', explanation: '"Rễ cây bám chặt vào đất, giữ cho đất không bị xói mòn khi mưa lớn."', order: 2 },
      { content: 'Khi rừng bị phá, điều gì xảy ra?', options: ['Lũ lụt, lở đất và hạn hán', 'Thời tiết tốt hơn', 'Đất phì nhiêu hơn', 'Nước nhiều hơn'], answer: 'Lũ lụt, lở đất và hạn hán', explanation: '"Khi rừng mất đi, mưa lớn gây lũ lụt và lở đất, mùa khô thì hạn hán kéo dài."', order: 3 },
      { content: 'Bài văn so sánh cây rừng với hình ảnh nào?', options: ['Người lính thầm lặng', 'Người nông dân chăm chỉ', 'Người thầy giáo', 'Người bảo vệ'], answer: 'Người lính thầm lặng', explanation: '"Những cây rừng như những người lính thầm lặng, ngày đêm bảo vệ nguồn nước và đất đai."', order: 4 },
      { content: 'Bảo vệ rừng đầu nguồn có ý nghĩa gì?', options: ['Bảo vệ cuộc sống hiện tại và tương lai', 'Chỉ bảo vệ động vật rừng', 'Chỉ để giữ vẻ đẹp', 'Chỉ để khai thác gỗ'], answer: 'Bảo vệ cuộc sống hiện tại và tương lai', explanation: '"Bảo vệ rừng đầu nguồn chính là bảo vệ cuộc sống của chúng ta và các thế hệ mai sau."', order: 5 },
    ],
  });

  // ── Bài tập Từ đồng nghĩa - trái nghĩa lớp 5 ──────────────────────────────
  await upsertExercise({
    id: `${G}-bt-dong-nghia`, title: 'Bài tập — Từ đồng nghĩa và trái nghĩa',
    type: 'MULTIPLE_CHOICE', category: 'NGU_PHAP', grade: 5, level: 'nang_cao', timeLimit: 540,
    createdBy: adminId,
    questions: [
      { content: 'Từ nào đồng nghĩa với "dũng cảm"?', options: ['can đảm', 'nhút nhát', 'sợ hãi', 'yếu đuối'], answer: 'can đảm', explanation: '"dũng cảm" và "can đảm" đều có nghĩa là không sợ hãi, gan dạ → đồng nghĩa.', order: 1 },
      { content: 'Từ nào trái nghĩa với "siêng năng"?', options: ['lười biếng', 'chăm chỉ', 'cần cù', 'miệt mài'], answer: 'lười biếng', explanation: '"siêng năng" (chăm chỉ) >< "lười biếng" (không chịu làm việc) → trái nghĩa.', order: 2 },
      { content: 'Từ nào đồng nghĩa với "xinh đẹp"?', options: ['duyên dáng', 'xấu xí', 'bình thường', 'gầy gò'], answer: 'duyên dáng', explanation: '"xinh đẹp" và "duyên dáng" đều chỉ vẻ đẹp dễ nhìn, ưa mắt → gần đồng nghĩa.', order: 3 },
      { content: 'Từ nào trái nghĩa với "hòa bình"?', options: ['chiến tranh', 'yên tĩnh', 'vui vẻ', 'đoàn kết'], answer: 'chiến tranh', explanation: '"hòa bình" (không có xung đột) >< "chiến tranh" (xung đột vũ trang) → trái nghĩa.', order: 4 },
      { content: 'Cặp từ nào là từ đồng âm (phát âm giống nhau, nghĩa khác)?', options: ['"bàn" (đồ vật) và "bàn" (thảo luận)', '"học" và "dạy"', '"to" và "nhỏ"', '"chạy" và "đi"'], answer: '"bàn" (đồ vật) và "bàn" (thảo luận)', explanation: '"bàn" có hai nghĩa khác nhau: đồ vật để ngồi làm việc và động từ thảo luận → từ đồng âm.', order: 5 },
    ],
  });

  console.log('    ✓ Lớp 5 hoàn thành');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('🇻🇳 Bắt đầu seed Tiếng Việt KNTT lớp 2–5...');
  const adminId = await getAdminId();

  await seedGrade2(adminId);
  await seedGrade3(adminId);
  await seedGrade4(adminId);
  await seedGrade5(adminId);

  console.log('✅ Seed Tiếng Việt KNTT hoàn thành!');
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
