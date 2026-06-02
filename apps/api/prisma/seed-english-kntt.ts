/**
 * Seed dữ liệu Tiếng Anh lớp 2–5
 * Bộ sách: Kết nối tri thức với cuộc sống (NXB Giáo dục Việt Nam)
 *
 * Chạy: npx tsx prisma/seed-english-kntt.ts
 */

import { PrismaClient } from '@prisma/client';

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

// ─── Upsert VocabSet ──────────────────────────────────────────────────────────
async function upsertSet(data: {
  id: string;
  title: string;
  description?: string;
  level: string;
  parentId?: string;
  createdBy: string;
}) {
  return prisma.vocabSet.upsert({
    where: { id: data.id },
    update: { description: data.description },
    create: {
      id: data.id,
      title: data.title,
      description: data.description,
      language: 'en',
      targetLang: 'vi',
      level: data.level,
      isPublic: true,
      createdBy: data.createdBy,
      parentId: data.parentId,
    },
  });
}

// ─── Upsert VocabItem ─────────────────────────────────────────────────────────
async function upsertItems(
  setId: string,
  items: {
    word: string;
    translation: string;
    pronunciation?: string;
    example?: string;
    exampleTrans?: string;
    topic?: string;
    itemLevel?: string;
    order: number;
  }[]
) {
  for (const item of items) {
    const id = `kntt-en-item-${slugify(setId + item.word)}`;
    await prisma.vocabItem.upsert({
      where: { id },
      update: {},
      create: { id, setId, ...item, synonyms: [], hints: [] },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 2
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade2(adminId: string) {
  console.log('  📘 Lớp 2...');
  const G = 'kntt-en-g2';

  // Parent set
  await upsertSet({ id: G, title: 'Tiếng Anh Lớp 2 — KNTT', level: 'A1',
    description: `Từ vựng Tiếng Anh lớp 2 theo bộ sách ${TEXTBOOK}`, createdBy: adminId });

  // ── Unit 1: Hello! ─────────────────────────────────────────────────────────
  const u1 = `${G}-u1`;
  await upsertSet({ id: u1, title: 'Unit 1: Hello! — Chào hỏi', parentId: G, level: 'A1',
    description: 'Từ chào hỏi, giới thiệu bản thân', createdBy: adminId });
  await upsertItems(u1, [
    { word: 'hello', translation: 'xin chào', pronunciation: '/həˈloʊ/', example: 'Hello! My name is Linh.', exampleTrans: 'Xin chào! Tên tôi là Linh.', topic: 'greetings', order: 1 },
    { word: 'hi', translation: 'chào (thân mật)', pronunciation: '/haɪ/', example: 'Hi, I am Nam.', exampleTrans: 'Chào, tôi là Nam.', topic: 'greetings', order: 2 },
    { word: 'goodbye', translation: 'tạm biệt', pronunciation: '/ˌɡʊdˈbaɪ/', example: 'Goodbye! See you tomorrow.', exampleTrans: 'Tạm biệt! Hẹn gặp lại ngày mai.', topic: 'greetings', order: 3 },
    { word: 'bye', translation: 'tạm biệt (thân mật)', pronunciation: '/baɪ/', example: 'Bye! Have a nice day.', exampleTrans: 'Tạm biệt! Chúc một ngày tốt lành.', topic: 'greetings', order: 4 },
    { word: 'name', translation: 'tên', pronunciation: '/neɪm/', example: 'What is your name?', exampleTrans: 'Tên bạn là gì?', topic: 'greetings', order: 5 },
    { word: 'my', translation: 'của tôi', pronunciation: '/maɪ/', example: 'My name is Lan.', exampleTrans: 'Tên tôi là Lan.', topic: 'greetings', order: 6 },
    { word: 'your', translation: 'của bạn', pronunciation: '/jɔːr/', example: 'What is your name?', exampleTrans: 'Tên bạn là gì?', topic: 'greetings', order: 7 },
    { word: 'nice', translation: 'dễ chịu, tốt', pronunciation: '/naɪs/', example: 'Nice to meet you!', exampleTrans: 'Rất vui được gặp bạn!', topic: 'greetings', order: 8 },
    { word: 'meet', translation: 'gặp gỡ', pronunciation: '/miːt/', example: 'Nice to meet you!', exampleTrans: 'Rất vui được gặp bạn!', topic: 'greetings', order: 9 },
    { word: 'thank you', translation: 'cảm ơn', pronunciation: '/ˈθæŋk juː/', example: 'Thank you very much.', exampleTrans: 'Cảm ơn bạn rất nhiều.', topic: 'greetings', order: 10 },
  ]);

  // ── Unit 2: My Family ──────────────────────────────────────────────────────
  const u2 = `${G}-u2`;
  await upsertSet({ id: u2, title: 'Unit 2: My Family — Gia đình tôi', parentId: G, level: 'A1',
    description: 'Từ vựng về các thành viên trong gia đình', createdBy: adminId });
  await upsertItems(u2, [
    { word: 'family', translation: 'gia đình', pronunciation: '/ˈfæməli/', example: 'I love my family.', exampleTrans: 'Tôi yêu gia đình tôi.', topic: 'family', order: 1 },
    { word: 'father', translation: 'bố, cha', pronunciation: '/ˈfɑːðər/', example: 'My father is a teacher.', exampleTrans: 'Bố tôi là giáo viên.', topic: 'family', order: 2 },
    { word: 'mother', translation: 'mẹ, mẫu', pronunciation: '/ˈmʌðər/', example: 'My mother is a doctor.', exampleTrans: 'Mẹ tôi là bác sĩ.', topic: 'family', order: 3 },
    { word: 'brother', translation: 'anh trai / em trai', pronunciation: '/ˈbrʌðər/', example: 'I have one brother.', exampleTrans: 'Tôi có một anh trai.', topic: 'family', order: 4 },
    { word: 'sister', translation: 'chị gái / em gái', pronunciation: '/ˈsɪstər/', example: 'My sister is eight years old.', exampleTrans: 'Em gái tôi tám tuổi.', topic: 'family', order: 5 },
    { word: 'grandfather', translation: 'ông nội / ông ngoại', pronunciation: '/ˈɡrænfɑːðər/', example: 'My grandfather tells great stories.', exampleTrans: 'Ông tôi kể chuyện rất hay.', topic: 'family', order: 6 },
    { word: 'grandmother', translation: 'bà nội / bà ngoại', pronunciation: '/ˈɡrænmʌðər/', example: 'My grandmother cooks well.', exampleTrans: 'Bà tôi nấu ăn giỏi.', topic: 'family', order: 7 },
    { word: 'baby', translation: 'em bé', pronunciation: '/ˈbeɪbi/', example: 'The baby is sleeping.', exampleTrans: 'Em bé đang ngủ.', topic: 'family', order: 8 },
    { word: 'old', translation: 'già, lớn tuổi', pronunciation: '/oʊld/', example: 'How old are you?', exampleTrans: 'Bạn bao nhiêu tuổi?', topic: 'family', order: 9 },
    { word: 'years old', translation: 'tuổi', pronunciation: '/jɪərz oʊld/', example: 'I am seven years old.', exampleTrans: 'Tôi bảy tuổi.', topic: 'family', order: 10 },
  ]);

  // ── Unit 3: My School ──────────────────────────────────────────────────────
  const u3 = `${G}-u3`;
  await upsertSet({ id: u3, title: 'Unit 3: My School — Trường học của tôi', parentId: G, level: 'A1',
    description: 'Từ vựng về trường học và đồ dùng học tập', createdBy: adminId });
  await upsertItems(u3, [
    { word: 'school', translation: 'trường học', pronunciation: '/skuːl/', example: 'I go to school every day.', exampleTrans: 'Tôi đến trường mỗi ngày.', topic: 'school', order: 1 },
    { word: 'classroom', translation: 'lớp học', pronunciation: '/ˈklæsruːm/', example: 'Our classroom is clean.', exampleTrans: 'Lớp học của chúng tôi sạch sẽ.', topic: 'school', order: 2 },
    { word: 'teacher', translation: 'giáo viên', pronunciation: '/ˈtiːtʃər/', example: 'My teacher is kind.', exampleTrans: 'Giáo viên của tôi tốt bụng.', topic: 'school', order: 3 },
    { word: 'student', translation: 'học sinh', pronunciation: '/ˈstuːdənt/', example: 'I am a student.', exampleTrans: 'Tôi là học sinh.', topic: 'school', order: 4 },
    { word: 'book', translation: 'sách', pronunciation: '/bʊk/', example: 'I have a new book.', exampleTrans: 'Tôi có một cuốn sách mới.', topic: 'school', order: 5 },
    { word: 'pencil', translation: 'bút chì', pronunciation: '/ˈpensəl/', example: 'I write with a pencil.', exampleTrans: 'Tôi viết bằng bút chì.', topic: 'school', order: 6 },
    { word: 'ruler', translation: 'thước kẻ', pronunciation: '/ˈruːlər/', example: 'I use a ruler to draw lines.', exampleTrans: 'Tôi dùng thước kẻ để vẽ đường thẳng.', topic: 'school', order: 7 },
    { word: 'eraser', translation: 'cục tẩy', pronunciation: '/ɪˈreɪzər/', example: 'I need an eraser.', exampleTrans: 'Tôi cần một cục tẩy.', topic: 'school', order: 8 },
    { word: 'bag', translation: 'túi, cặp sách', pronunciation: '/bæɡ/', example: 'My school bag is heavy.', exampleTrans: 'Cặp sách của tôi nặng.', topic: 'school', order: 9 },
    { word: 'desk', translation: 'bàn học', pronunciation: '/desk/', example: 'My book is on the desk.', exampleTrans: 'Cuốn sách của tôi ở trên bàn.', topic: 'school', order: 10 },
    { word: 'chair', translation: 'ghế', pronunciation: '/tʃer/', example: 'Please sit on the chair.', exampleTrans: 'Hãy ngồi xuống ghế.', topic: 'school', order: 11 },
  ]);

  // ── Unit 4: My Body ────────────────────────────────────────────────────────
  const u4 = `${G}-u4`;
  await upsertSet({ id: u4, title: 'Unit 4: My Body — Cơ thể tôi', parentId: G, level: 'A1',
    description: 'Từ vựng về các bộ phận cơ thể', createdBy: adminId });
  await upsertItems(u4, [
    { word: 'head', translation: 'đầu', pronunciation: '/hed/', example: 'I have a hat on my head.', exampleTrans: 'Tôi đội mũ trên đầu.', topic: 'body', order: 1 },
    { word: 'eye', translation: 'mắt', pronunciation: '/aɪ/', example: 'I have two eyes.', exampleTrans: 'Tôi có hai mắt.', topic: 'body', order: 2 },
    { word: 'ear', translation: 'tai', pronunciation: '/ɪr/', example: 'My ears are big.', exampleTrans: 'Tai tôi to.', topic: 'body', order: 3 },
    { word: 'nose', translation: 'mũi', pronunciation: '/noʊz/', example: 'My nose is small.', exampleTrans: 'Mũi tôi nhỏ.', topic: 'body', order: 4 },
    { word: 'mouth', translation: 'miệng', pronunciation: '/maʊθ/', example: 'Open your mouth.', exampleTrans: 'Mở miệng ra.', topic: 'body', order: 5 },
    { word: 'hand', translation: 'tay', pronunciation: '/hænd/', example: 'Wash your hands.', exampleTrans: 'Rửa tay đi.', topic: 'body', order: 6 },
    { word: 'foot', translation: 'bàn chân', pronunciation: '/fʊt/', example: 'My foot hurts.', exampleTrans: 'Chân tôi đau.', topic: 'body', order: 7 },
    { word: 'leg', translation: 'chân, cẳng chân', pronunciation: '/leɡ/', example: 'I have two legs.', exampleTrans: 'Tôi có hai chân.', topic: 'body', order: 8 },
    { word: 'arm', translation: 'cánh tay', pronunciation: '/ɑːrm/', example: 'She has long arms.', exampleTrans: 'Cô ấy có cánh tay dài.', topic: 'body', order: 9 },
    { word: 'hair', translation: 'tóc', pronunciation: '/her/', example: 'She has long black hair.', exampleTrans: 'Cô ấy có mái tóc dài đen.', topic: 'body', order: 10 },
  ]);

  // ── Unit 5: Colors & Numbers ───────────────────────────────────────────────
  const u5 = `${G}-u5`;
  await upsertSet({ id: u5, title: 'Unit 5: Colors & Numbers — Màu sắc và Số đếm', parentId: G, level: 'A1',
    description: 'Màu sắc cơ bản và số đếm 1–20', createdBy: adminId });
  await upsertItems(u5, [
    { word: 'red', translation: 'màu đỏ', pronunciation: '/red/', example: 'The apple is red.', exampleTrans: 'Quả táo màu đỏ.', topic: 'colors', order: 1 },
    { word: 'blue', translation: 'màu xanh dương', pronunciation: '/bluː/', example: 'The sky is blue.', exampleTrans: 'Bầu trời màu xanh dương.', topic: 'colors', order: 2 },
    { word: 'green', translation: 'màu xanh lá', pronunciation: '/ɡriːn/', example: 'Grass is green.', exampleTrans: 'Cỏ màu xanh lá.', topic: 'colors', order: 3 },
    { word: 'yellow', translation: 'màu vàng', pronunciation: '/ˈjeloʊ/', example: 'The sun is yellow.', exampleTrans: 'Mặt trời màu vàng.', topic: 'colors', order: 4 },
    { word: 'orange', translation: 'màu cam', pronunciation: '/ˈɔːrɪndʒ/', example: 'The orange is orange.', exampleTrans: 'Quả cam màu cam.', topic: 'colors', order: 5 },
    { word: 'purple', translation: 'màu tím', pronunciation: '/ˈpɜːrpəl/', example: 'She likes purple flowers.', exampleTrans: 'Cô ấy thích hoa tím.', topic: 'colors', order: 6 },
    { word: 'pink', translation: 'màu hồng', pronunciation: '/pɪŋk/', example: 'Her dress is pink.', exampleTrans: 'Váy của cô ấy màu hồng.', topic: 'colors', order: 7 },
    { word: 'white', translation: 'màu trắng', pronunciation: '/waɪt/', example: 'Snow is white.', exampleTrans: 'Tuyết màu trắng.', topic: 'colors', order: 8 },
    { word: 'black', translation: 'màu đen', pronunciation: '/blæk/', example: 'The cat is black.', exampleTrans: 'Con mèo màu đen.', topic: 'colors', order: 9 },
    { word: 'brown', translation: 'màu nâu', pronunciation: '/braʊn/', example: 'The dog is brown.', exampleTrans: 'Con chó màu nâu.', topic: 'colors', order: 10 },
    { word: 'one', translation: 'một (1)', pronunciation: '/wʌn/', example: 'I have one cat.', exampleTrans: 'Tôi có một con mèo.', topic: 'numbers', order: 11 },
    { word: 'two', translation: 'hai (2)', pronunciation: '/tuː/', example: 'I have two hands.', exampleTrans: 'Tôi có hai tay.', topic: 'numbers', order: 12 },
    { word: 'three', translation: 'ba (3)', pronunciation: '/θriː/', example: 'Three birds on a tree.', exampleTrans: 'Ba con chim trên cây.', topic: 'numbers', order: 13 },
    { word: 'four', translation: 'bốn (4)', pronunciation: '/fɔːr/', example: 'A dog has four legs.', exampleTrans: 'Con chó có bốn chân.', topic: 'numbers', order: 14 },
    { word: 'five', translation: 'năm (5)', pronunciation: '/faɪv/', example: 'I have five fingers.', exampleTrans: 'Tôi có năm ngón tay.', topic: 'numbers', order: 15 },
    { word: 'ten', translation: 'mười (10)', pronunciation: '/ten/', example: 'There are ten students.', exampleTrans: 'Có mười học sinh.', topic: 'numbers', order: 16 },
    { word: 'twenty', translation: 'hai mươi (20)', pronunciation: '/ˈtwenti/', example: 'I have twenty books.', exampleTrans: 'Tôi có hai mươi cuốn sách.', topic: 'numbers', order: 17 },
  ]);

  // ── Unit 6: Animals ────────────────────────────────────────────────────────
  const u6 = `${G}-u6`;
  await upsertSet({ id: u6, title: 'Unit 6: Animals — Động vật', parentId: G, level: 'A1',
    description: 'Từ vựng về các loài động vật quen thuộc', createdBy: adminId });
  await upsertItems(u6, [
    { word: 'cat', translation: 'con mèo', pronunciation: '/kæt/', example: 'My cat is white.', exampleTrans: 'Con mèo của tôi màu trắng.', topic: 'animals', order: 1 },
    { word: 'dog', translation: 'con chó', pronunciation: '/dɔːɡ/', example: 'I have a pet dog.', exampleTrans: 'Tôi có một con chó cưng.', topic: 'animals', order: 2 },
    { word: 'fish', translation: 'con cá', pronunciation: '/fɪʃ/', example: 'I can see fish in the pond.', exampleTrans: 'Tôi thấy cá trong ao.', topic: 'animals', order: 3 },
    { word: 'bird', translation: 'con chim', pronunciation: '/bɜːrd/', example: 'The bird sings beautifully.', exampleTrans: 'Con chim hót rất hay.', topic: 'animals', order: 4 },
    { word: 'rabbit', translation: 'con thỏ', pronunciation: '/ˈræbɪt/', example: 'The rabbit is fluffy.', exampleTrans: 'Con thỏ rất bông xù.', topic: 'animals', order: 5 },
    { word: 'cow', translation: 'con bò', pronunciation: '/kaʊ/', example: 'The cow gives us milk.', exampleTrans: 'Con bò cho chúng ta sữa.', topic: 'animals', order: 6 },
    { word: 'chicken', translation: 'con gà', pronunciation: '/ˈtʃɪkɪn/', example: 'The chicken lays eggs.', exampleTrans: 'Con gà đẻ trứng.', topic: 'animals', order: 7 },
    { word: 'duck', translation: 'con vịt', pronunciation: '/dʌk/', example: 'Ducks can swim.', exampleTrans: 'Vịt có thể bơi.', topic: 'animals', order: 8 },
    { word: 'monkey', translation: 'con khỉ', pronunciation: '/ˈmʌŋki/', example: 'Monkeys live in the jungle.', exampleTrans: 'Khỉ sống trong rừng rậm.', topic: 'animals', order: 9 },
    { word: 'elephant', translation: 'con voi', pronunciation: '/ˈelɪfənt/', example: 'The elephant has a long trunk.', exampleTrans: 'Con voi có cái vòi dài.', topic: 'animals', order: 10 },
    { word: 'tiger', translation: 'con hổ', pronunciation: '/ˈtaɪɡər/', example: 'The tiger is a wild animal.', exampleTrans: 'Hổ là động vật hoang dã.', topic: 'animals', order: 11 },
  ]);

  // ── Unit 7: Food & Drinks ──────────────────────────────────────────────────
  const u7 = `${G}-u7`;
  await upsertSet({ id: u7, title: 'Unit 7: Food & Drinks — Thức ăn và Đồ uống', parentId: G, level: 'A1',
    description: 'Từ vựng về thức ăn và đồ uống thông dụng', createdBy: adminId });
  await upsertItems(u7, [
    { word: 'rice', translation: 'cơm, gạo', pronunciation: '/raɪs/', example: 'I eat rice every day.', exampleTrans: 'Tôi ăn cơm mỗi ngày.', topic: 'food', order: 1 },
    { word: 'bread', translation: 'bánh mì', pronunciation: '/bred/', example: 'I have bread for breakfast.', exampleTrans: 'Tôi ăn bánh mì vào bữa sáng.', topic: 'food', order: 2 },
    { word: 'noodle', translation: 'mì, bún', pronunciation: '/ˈnuːdəl/', example: 'I like noodle soup.', exampleTrans: 'Tôi thích canh mì.', topic: 'food', order: 3 },
    { word: 'apple', translation: 'quả táo', pronunciation: '/ˈæpəl/', example: 'An apple a day keeps the doctor away.', exampleTrans: 'Một quả táo mỗi ngày giúp bạn không cần gặp bác sĩ.', topic: 'food', order: 4 },
    { word: 'banana', translation: 'quả chuối', pronunciation: '/bəˈnænə/', example: 'Monkeys eat bananas.', exampleTrans: 'Khỉ ăn chuối.', topic: 'food', order: 5 },
    { word: 'orange', translation: 'quả cam', pronunciation: '/ˈɔːrɪndʒ/', example: 'I drink orange juice.', exampleTrans: 'Tôi uống nước cam.', topic: 'food', order: 6 },
    { word: 'milk', translation: 'sữa', pronunciation: '/mɪlk/', example: 'I drink milk every morning.', exampleTrans: 'Tôi uống sữa mỗi buổi sáng.', topic: 'drinks', order: 7 },
    { word: 'water', translation: 'nước', pronunciation: '/ˈwɔːtər/', example: 'Drink more water every day.', exampleTrans: 'Uống nhiều nước mỗi ngày.', topic: 'drinks', order: 8 },
    { word: 'juice', translation: 'nước ép', pronunciation: '/dʒuːs/', example: 'I like apple juice.', exampleTrans: 'Tôi thích nước ép táo.', topic: 'drinks', order: 9 },
    { word: 'egg', translation: 'quả trứng', pronunciation: '/eɡ/', example: 'I eat two eggs for breakfast.', exampleTrans: 'Tôi ăn hai quả trứng vào bữa sáng.', topic: 'food', order: 10 },
  ]);

  console.log('  ✅ Lớp 2 xong — 7 bộ từ vựng');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 3
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade3(adminId: string) {
  console.log('  📗 Lớp 3...');
  const G = 'kntt-en-g3';

  await upsertSet({ id: G, title: 'Tiếng Anh Lớp 3 — KNTT', level: 'A1',
    description: `Từ vựng Tiếng Anh lớp 3 theo bộ sách ${TEXTBOOK}`, createdBy: adminId });

  // ── Unit 1: My New School ──────────────────────────────────────────────────
  const u1 = `${G}-u1`;
  await upsertSet({ id: u1, title: 'Unit 1: My New School — Trường học mới', parentId: G, level: 'A1',
    description: 'Các phòng trong trường, hoạt động học tập', createdBy: adminId });
  await upsertItems(u1, [
    { word: 'library', translation: 'thư viện', pronunciation: '/ˈlaɪbreri/', example: 'I borrow books from the library.', exampleTrans: 'Tôi mượn sách từ thư viện.', topic: 'school', order: 1 },
    { word: 'playground', translation: 'sân chơi', pronunciation: '/ˈpleɪɡraʊnd/', example: 'We play on the playground.', exampleTrans: 'Chúng tôi chơi ở sân chơi.', topic: 'school', order: 2 },
    { word: 'canteen', translation: 'căng-tin, nhà ăn', pronunciation: '/kænˈtiːn/', example: 'I have lunch at the school canteen.', exampleTrans: 'Tôi ăn trưa ở căng-tin trường.', topic: 'school', order: 3 },
    { word: 'gym', translation: 'phòng thể dục', pronunciation: '/dʒɪm/', example: 'We do PE in the gym.', exampleTrans: 'Chúng tôi học thể dục trong phòng gym.', topic: 'school', order: 4 },
    { word: 'lesson', translation: 'bài học, tiết học', pronunciation: '/ˈlesən/', example: 'I have six lessons today.', exampleTrans: 'Hôm nay tôi có sáu tiết học.', topic: 'school', order: 5 },
    { word: 'subject', translation: 'môn học', pronunciation: '/ˈsʌbdʒɪkt/', example: 'Maths is my favourite subject.', exampleTrans: 'Toán là môn học yêu thích của tôi.', topic: 'school', order: 6 },
    { word: 'English', translation: 'tiếng Anh', pronunciation: '/ˈɪŋɡlɪʃ/', example: 'I study English at school.', exampleTrans: 'Tôi học tiếng Anh ở trường.', topic: 'school', order: 7 },
    { word: 'Maths', translation: 'Toán học', pronunciation: '/mæθs/', example: 'Maths class starts at 7 a.m.', exampleTrans: 'Giờ Toán bắt đầu lúc 7 giờ sáng.', topic: 'school', order: 8 },
    { word: 'Science', translation: 'Khoa học', pronunciation: '/ˈsaɪəns/', example: 'I like Science class.', exampleTrans: 'Tôi thích giờ Khoa học.', topic: 'school', order: 9 },
    { word: 'timetable', translation: 'thời khóa biểu', pronunciation: '/ˈtaɪmteɪbəl/', example: 'Look at the timetable.', exampleTrans: 'Hãy xem thời khóa biểu.', topic: 'school', order: 10 },
  ]);

  // ── Unit 2: My House ───────────────────────────────────────────────────────
  const u2 = `${G}-u2`;
  await upsertSet({ id: u2, title: 'Unit 2: My House — Ngôi nhà của tôi', parentId: G, level: 'A1',
    description: 'Các phòng trong nhà và đồ vật', createdBy: adminId });
  await upsertItems(u2, [
    { word: 'house', translation: 'ngôi nhà', pronunciation: '/haʊs/', example: 'I live in a small house.', exampleTrans: 'Tôi sống trong một ngôi nhà nhỏ.', topic: 'house', order: 1 },
    { word: 'bedroom', translation: 'phòng ngủ', pronunciation: '/ˈbedruːm/', example: 'I sleep in my bedroom.', exampleTrans: 'Tôi ngủ trong phòng ngủ của tôi.', topic: 'house', order: 2 },
    { word: 'kitchen', translation: 'nhà bếp', pronunciation: '/ˈkɪtʃɪn/', example: 'My mother cooks in the kitchen.', exampleTrans: 'Mẹ tôi nấu ăn trong bếp.', topic: 'house', order: 3 },
    { word: 'bathroom', translation: 'phòng tắm', pronunciation: '/ˈbæθruːm/', example: 'I brush my teeth in the bathroom.', exampleTrans: 'Tôi đánh răng trong phòng tắm.', topic: 'house', order: 4 },
    { word: 'living room', translation: 'phòng khách', pronunciation: '/ˈlɪvɪŋ ruːm/', example: 'We watch TV in the living room.', exampleTrans: 'Chúng tôi xem TV trong phòng khách.', topic: 'house', order: 5 },
    { word: 'garden', translation: 'vườn', pronunciation: '/ˈɡɑːrdən/', example: 'We grow flowers in the garden.', exampleTrans: 'Chúng tôi trồng hoa trong vườn.', topic: 'house', order: 6 },
    { word: 'sofa', translation: 'ghế sofa', pronunciation: '/ˈsoʊfə/', example: 'I sit on the sofa.', exampleTrans: 'Tôi ngồi trên ghế sofa.', topic: 'house', order: 7 },
    { word: 'window', translation: 'cửa sổ', pronunciation: '/ˈwɪndoʊ/', example: 'Open the window, please.', exampleTrans: 'Làm ơn mở cửa sổ ra.', topic: 'house', order: 8 },
    { word: 'door', translation: 'cánh cửa', pronunciation: '/dɔːr/', example: 'Please close the door.', exampleTrans: 'Hãy đóng cửa lại.', topic: 'house', order: 9 },
    { word: 'stairs', translation: 'cầu thang', pronunciation: '/sterz/', example: 'Go up the stairs to your room.', exampleTrans: 'Đi lên cầu thang vào phòng của bạn.', topic: 'house', order: 10 },
  ]);

  // ── Unit 3: My Friends ─────────────────────────────────────────────────────
  const u3 = `${G}-u3`;
  await upsertSet({ id: u3, title: 'Unit 3: My Friends — Bạn bè của tôi', parentId: G, level: 'A1',
    description: 'Tính từ miêu tả người, hoạt động cùng bạn bè', createdBy: adminId });
  await upsertItems(u3, [
    { word: 'friend', translation: 'bạn bè', pronunciation: '/frend/', example: 'She is my best friend.', exampleTrans: 'Cô ấy là người bạn thân nhất của tôi.', topic: 'people', order: 1 },
    { word: 'tall', translation: 'cao (người)', pronunciation: '/tɔːl/', example: 'My friend is tall.', exampleTrans: 'Bạn tôi cao.', topic: 'adjectives', order: 2 },
    { word: 'short', translation: 'thấp, lùn', pronunciation: '/ʃɔːrt/', example: 'My brother is short.', exampleTrans: 'Anh tôi lùn.', topic: 'adjectives', order: 3 },
    { word: 'thin', translation: 'gầy', pronunciation: '/θɪn/', example: 'The boy is thin.', exampleTrans: 'Cậu bé gầy.', topic: 'adjectives', order: 4 },
    { word: 'fat', translation: 'béo', pronunciation: '/fæt/', example: 'The cat is fat.', exampleTrans: 'Con mèo béo.', topic: 'adjectives', order: 5 },
    { word: 'kind', translation: 'tốt bụng', pronunciation: '/kaɪnd/', example: 'My teacher is kind.', exampleTrans: 'Giáo viên của tôi tốt bụng.', topic: 'adjectives', order: 6 },
    { word: 'funny', translation: 'vui tính, hài hước', pronunciation: '/ˈfʌni/', example: 'My friend is very funny.', exampleTrans: 'Bạn tôi rất hài hước.', topic: 'adjectives', order: 7 },
    { word: 'smart', translation: 'thông minh', pronunciation: '/smɑːrt/', example: 'She is a smart student.', exampleTrans: 'Cô ấy là học sinh thông minh.', topic: 'adjectives', order: 8 },
    { word: 'play', translation: 'chơi', pronunciation: '/pleɪ/', example: 'We play together after school.', exampleTrans: 'Chúng tôi chơi cùng nhau sau giờ học.', topic: 'activities', order: 9 },
    { word: 'share', translation: 'chia sẻ', pronunciation: '/ʃer/', example: 'We share our toys.', exampleTrans: 'Chúng tôi chia sẻ đồ chơi.', topic: 'activities', order: 10 },
  ]);

  // ── Unit 4: My Neighbourhood ───────────────────────────────────────────────
  const u4 = `${G}-u4`;
  await upsertSet({ id: u4, title: 'Unit 4: My Neighbourhood — Khu phố của tôi', parentId: G, level: 'A1',
    description: 'Các địa điểm trong khu phố', createdBy: adminId });
  await upsertItems(u4, [
    { word: 'market', translation: 'chợ', pronunciation: '/ˈmɑːrkɪt/', example: 'My mother goes to the market.', exampleTrans: 'Mẹ tôi đi chợ.', topic: 'places', order: 1 },
    { word: 'park', translation: 'công viên', pronunciation: '/pɑːrk/', example: 'I play in the park.', exampleTrans: 'Tôi chơi ở công viên.', topic: 'places', order: 2 },
    { word: 'hospital', translation: 'bệnh viện', pronunciation: '/ˈhɑːspɪtəl/', example: 'My father works at a hospital.', exampleTrans: 'Bố tôi làm việc ở bệnh viện.', topic: 'places', order: 3 },
    { word: 'supermarket', translation: 'siêu thị', pronunciation: '/ˈsuːpərmɑːrkɪt/', example: 'We buy food at the supermarket.', exampleTrans: 'Chúng tôi mua thức ăn ở siêu thị.', topic: 'places', order: 4 },
    { word: 'post office', translation: 'bưu điện', pronunciation: '/ˈpoʊst ɒfɪs/', example: 'I send letters at the post office.', exampleTrans: 'Tôi gửi thư ở bưu điện.', topic: 'places', order: 5 },
    { word: 'bookshop', translation: 'hiệu sách', pronunciation: '/ˈbʊkʃɒp/', example: 'I buy books at the bookshop.', exampleTrans: 'Tôi mua sách ở hiệu sách.', topic: 'places', order: 6 },
    { word: 'street', translation: 'con đường, phố', pronunciation: '/striːt/', example: 'My school is on this street.', exampleTrans: 'Trường tôi ở trên phố này.', topic: 'places', order: 7 },
    { word: 'near', translation: 'gần', pronunciation: '/nɪr/', example: 'The school is near my house.', exampleTrans: 'Trường học gần nhà tôi.', topic: 'directions', order: 8 },
    { word: 'far', translation: 'xa', pronunciation: '/fɑːr/', example: 'The hospital is far from here.', exampleTrans: 'Bệnh viện xa đây.', topic: 'directions', order: 9 },
    { word: 'next to', translation: 'bên cạnh', pronunciation: '/nekst tuː/', example: 'The bank is next to the post office.', exampleTrans: 'Ngân hàng ở bên cạnh bưu điện.', topic: 'directions', order: 10 },
  ]);

  // ── Unit 5: Sports and Leisure ─────────────────────────────────────────────
  const u5 = `${G}-u5`;
  await upsertSet({ id: u5, title: 'Unit 5: Sports and Leisure — Thể thao và Giải trí', parentId: G, level: 'A1',
    description: 'Từ vựng về các môn thể thao và hoạt động vui chơi', createdBy: adminId });
  await upsertItems(u5, [
    { word: 'football', translation: 'bóng đá', pronunciation: '/ˈfʊtbɔːl/', example: 'I play football after school.', exampleTrans: 'Tôi chơi bóng đá sau giờ học.', topic: 'sports', order: 1 },
    { word: 'swimming', translation: 'bơi lội', pronunciation: '/ˈswɪmɪŋ/', example: 'I go swimming on Sundays.', exampleTrans: 'Tôi đi bơi vào Chủ nhật.', topic: 'sports', order: 2 },
    { word: 'cycling', translation: 'đạp xe', pronunciation: '/ˈsaɪklɪŋ/', example: 'Cycling is good exercise.', exampleTrans: 'Đạp xe là bài tập tốt.', topic: 'sports', order: 3 },
    { word: 'badminton', translation: 'cầu lông', pronunciation: '/ˈbædmɪntən/', example: 'We play badminton in PE class.', exampleTrans: 'Chúng tôi chơi cầu lông trong giờ thể dục.', topic: 'sports', order: 4 },
    { word: 'tennis', translation: 'quần vợt', pronunciation: '/ˈtenɪs/', example: 'She plays tennis every week.', exampleTrans: 'Cô ấy chơi quần vợt mỗi tuần.', topic: 'sports', order: 5 },
    { word: 'reading', translation: 'đọc sách', pronunciation: '/ˈriːdɪŋ/', example: 'Reading is my hobby.', exampleTrans: 'Đọc sách là sở thích của tôi.', topic: 'leisure', order: 6 },
    { word: 'singing', translation: 'hát', pronunciation: '/ˈsɪŋɪŋ/', example: 'I love singing songs.', exampleTrans: 'Tôi thích hát.', topic: 'leisure', order: 7 },
    { word: 'drawing', translation: 'vẽ tranh', pronunciation: '/ˈdrɔːɪŋ/', example: 'She likes drawing animals.', exampleTrans: 'Cô ấy thích vẽ động vật.', topic: 'leisure', order: 8 },
    { word: 'dancing', translation: 'nhảy múa', pronunciation: '/ˈdænsɪŋ/', example: 'She is good at dancing.', exampleTrans: 'Cô ấy giỏi nhảy múa.', topic: 'leisure', order: 9 },
    { word: 'cooking', translation: 'nấu ăn', pronunciation: '/ˈkʊkɪŋ/', example: 'My mum enjoys cooking.', exampleTrans: 'Mẹ tôi thích nấu ăn.', topic: 'leisure', order: 10 },
  ]);

  // ── Unit 6: Weather ────────────────────────────────────────────────────────
  const u6 = `${G}-u6`;
  await upsertSet({ id: u6, title: 'Unit 6: Weather — Thời tiết', parentId: G, level: 'A1',
    description: 'Từ vựng về thời tiết và mùa trong năm', createdBy: adminId });
  await upsertItems(u6, [
    { word: 'sunny', translation: 'nắng', pronunciation: '/ˈsʌni/', example: 'It is sunny today.', exampleTrans: 'Hôm nay trời nắng.', topic: 'weather', order: 1 },
    { word: 'cloudy', translation: 'nhiều mây, u ám', pronunciation: '/ˈklaʊdi/', example: 'It is cloudy outside.', exampleTrans: 'Bên ngoài trời âm u.', topic: 'weather', order: 2 },
    { word: 'rainy', translation: 'có mưa', pronunciation: '/ˈreɪni/', example: 'It is rainy in the summer.', exampleTrans: 'Mùa hè hay có mưa.', topic: 'weather', order: 3 },
    { word: 'windy', translation: 'có gió', pronunciation: '/ˈwɪndi/', example: 'It is very windy today.', exampleTrans: 'Hôm nay trời rất nhiều gió.', topic: 'weather', order: 4 },
    { word: 'hot', translation: 'nóng', pronunciation: '/hɑːt/', example: 'Summer is very hot.', exampleTrans: 'Mùa hè rất nóng.', topic: 'weather', order: 5 },
    { word: 'cold', translation: 'lạnh', pronunciation: '/koʊld/', example: 'Winter is cold.', exampleTrans: 'Mùa đông lạnh.', topic: 'weather', order: 6 },
    { word: 'warm', translation: 'ấm áp', pronunciation: '/wɔːrm/', example: 'Spring is warm and beautiful.', exampleTrans: 'Mùa xuân ấm áp và đẹp.', topic: 'weather', order: 7 },
    { word: 'spring', translation: 'mùa xuân', pronunciation: '/sprɪŋ/', example: 'Flowers bloom in spring.', exampleTrans: 'Hoa nở vào mùa xuân.', topic: 'seasons', order: 8 },
    { word: 'summer', translation: 'mùa hè', pronunciation: '/ˈsʌmər/', example: 'I go to the beach in summer.', exampleTrans: 'Tôi đi biển vào mùa hè.', topic: 'seasons', order: 9 },
    { word: 'autumn', translation: 'mùa thu', pronunciation: '/ˈɔːtəm/', example: 'Leaves fall in autumn.', exampleTrans: 'Lá rụng vào mùa thu.', topic: 'seasons', order: 10 },
    { word: 'winter', translation: 'mùa đông', pronunciation: '/ˈwɪntər/', example: 'It snows in winter.', exampleTrans: 'Trời tuyết vào mùa đông.', topic: 'seasons', order: 11 },
  ]);

  console.log('  ✅ Lớp 3 xong — 6 bộ từ vựng');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 4
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade4(adminId: string) {
  console.log('  📙 Lớp 4...');
  const G = 'kntt-en-g4';

  await upsertSet({ id: G, title: 'Tiếng Anh Lớp 4 — KNTT', level: 'A1',
    description: `Từ vựng Tiếng Anh lớp 4 theo bộ sách ${TEXTBOOK}`, createdBy: adminId });

  // ── Unit 1: Countries & Nationalities ─────────────────────────────────────
  const u1 = `${G}-u1`;
  await upsertSet({ id: u1, title: 'Unit 1: Countries & Nationalities — Các quốc gia', parentId: G, level: 'A1',
    description: 'Tên các nước và quốc tịch', createdBy: adminId });
  await upsertItems(u1, [
    { word: 'Viet Nam', translation: 'Việt Nam', pronunciation: '/ˌviet ˈnæm/', example: 'I am from Viet Nam.', exampleTrans: 'Tôi đến từ Việt Nam.', topic: 'countries', order: 1 },
    { word: 'Vietnamese', translation: 'người Việt Nam / tiếng Việt', pronunciation: '/ˌvietnəˈmiːz/', example: 'She is Vietnamese.', exampleTrans: 'Cô ấy là người Việt Nam.', topic: 'countries', order: 2 },
    { word: 'England', translation: 'nước Anh', pronunciation: '/ˈɪŋɡlənd/', example: 'He is from England.', exampleTrans: 'Anh ấy đến từ nước Anh.', topic: 'countries', order: 3 },
    { word: 'English', translation: 'người Anh / tiếng Anh', pronunciation: '/ˈɪŋɡlɪʃ/', example: 'She speaks English.', exampleTrans: 'Cô ấy nói tiếng Anh.', topic: 'countries', order: 4 },
    { word: 'Japan', translation: 'Nhật Bản', pronunciation: '/dʒəˈpæn/', example: 'Japan is a beautiful country.', exampleTrans: 'Nhật Bản là một đất nước đẹp.', topic: 'countries', order: 5 },
    { word: 'Japanese', translation: 'người / tiếng Nhật', pronunciation: '/ˌdʒæpəˈniːz/', example: 'My friend is Japanese.', exampleTrans: 'Bạn tôi là người Nhật.', topic: 'countries', order: 6 },
    { word: 'Korea', translation: 'Hàn Quốc', pronunciation: '/kəˈriːə/', example: 'K-pop comes from Korea.', exampleTrans: 'K-pop đến từ Hàn Quốc.', topic: 'countries', order: 7 },
    { word: 'Korean', translation: 'người / tiếng Hàn', pronunciation: '/kəˈriːən/', example: 'She likes Korean food.', exampleTrans: 'Cô ấy thích đồ ăn Hàn Quốc.', topic: 'countries', order: 8 },
    { word: 'Australia', translation: 'Úc', pronunciation: '/ɒˈstreɪliə/', example: 'Kangaroos live in Australia.', exampleTrans: 'Kangaroo sống ở Úc.', topic: 'countries', order: 9 },
    { word: 'Australian', translation: 'người Úc', pronunciation: '/ɒˈstreɪliən/', example: 'My pen pal is Australian.', exampleTrans: 'Bạn thư của tôi là người Úc.', topic: 'countries', order: 10 },
    { word: 'France', translation: 'nước Pháp', pronunciation: '/fræns/', example: 'The Eiffel Tower is in France.', exampleTrans: 'Tháp Eiffel ở Pháp.', topic: 'countries', order: 11 },
  ]);

  // ── Unit 2: Daily Routines ─────────────────────────────────────────────────
  const u2 = `${G}-u2`;
  await upsertSet({ id: u2, title: 'Unit 2: Daily Routines — Thói quen hằng ngày', parentId: G, level: 'A1',
    description: 'Từ vựng về các hoạt động thường ngày và thời gian', createdBy: adminId });
  await upsertItems(u2, [
    { word: 'wake up', translation: 'thức dậy', pronunciation: '/weɪk ʌp/', example: 'I wake up at 6 a.m.', exampleTrans: 'Tôi thức dậy lúc 6 giờ sáng.', topic: 'routines', order: 1 },
    { word: 'get dressed', translation: 'mặc quần áo', pronunciation: '/ɡet drest/', example: 'I get dressed after breakfast.', exampleTrans: 'Tôi mặc quần áo sau bữa sáng.', topic: 'routines', order: 2 },
    { word: 'have breakfast', translation: 'ăn sáng', pronunciation: '/hæv ˈbrekfəst/', example: 'I have breakfast at 6:30.', exampleTrans: 'Tôi ăn sáng lúc 6:30.', topic: 'routines', order: 3 },
    { word: 'go to school', translation: 'đến trường', pronunciation: '/ɡoʊ tə skuːl/', example: 'I go to school by bike.', exampleTrans: 'Tôi đến trường bằng xe đạp.', topic: 'routines', order: 4 },
    { word: 'have lunch', translation: 'ăn trưa', pronunciation: '/hæv lʌntʃ/', example: 'I have lunch at noon.', exampleTrans: 'Tôi ăn trưa lúc 12 giờ.', topic: 'routines', order: 5 },
    { word: 'do homework', translation: 'làm bài tập', pronunciation: '/duː ˈhoʊmwɜːrk/', example: 'I do homework in the evening.', exampleTrans: 'Tôi làm bài tập vào buổi tối.', topic: 'routines', order: 6 },
    { word: 'have dinner', translation: 'ăn tối', pronunciation: '/hæv ˈdɪnər/', example: 'We have dinner together.', exampleTrans: 'Chúng tôi ăn tối cùng nhau.', topic: 'routines', order: 7 },
    { word: 'go to bed', translation: 'đi ngủ', pronunciation: '/ɡoʊ tə bed/', example: 'I go to bed at 9 p.m.', exampleTrans: 'Tôi đi ngủ lúc 9 giờ tối.', topic: 'routines', order: 8 },
    { word: 'always', translation: 'luôn luôn', pronunciation: '/ˈɔːlweɪz/', example: 'I always brush my teeth.', exampleTrans: 'Tôi luôn luôn đánh răng.', topic: 'adverbs', order: 9 },
    { word: 'usually', translation: 'thường thường', pronunciation: '/ˈjuːʒuəli/', example: 'I usually walk to school.', exampleTrans: 'Tôi thường đi bộ đến trường.', topic: 'adverbs', order: 10 },
    { word: 'sometimes', translation: 'đôi khi', pronunciation: '/ˈsʌmtaɪmz/', example: 'I sometimes play chess.', exampleTrans: 'Đôi khi tôi chơi cờ.', topic: 'adverbs', order: 11 },
    { word: 'never', translation: 'không bao giờ', pronunciation: '/ˈnevər/', example: 'I never skip breakfast.', exampleTrans: 'Tôi không bao giờ bỏ bữa sáng.', topic: 'adverbs', order: 12 },
  ]);

  // ── Unit 3: Transportation ─────────────────────────────────────────────────
  const u3 = `${G}-u3`;
  await upsertSet({ id: u3, title: 'Unit 3: Getting Around — Phương tiện đi lại', parentId: G, level: 'A1',
    description: 'Các phương tiện giao thông và hướng dẫn đường', createdBy: adminId });
  await upsertItems(u3, [
    { word: 'bus', translation: 'xe buýt', pronunciation: '/bʌs/', example: 'I go to school by bus.', exampleTrans: 'Tôi đến trường bằng xe buýt.', topic: 'transport', order: 1 },
    { word: 'car', translation: 'xe ô tô', pronunciation: '/kɑːr/', example: 'My father drives a car.', exampleTrans: 'Bố tôi lái xe ô tô.', topic: 'transport', order: 2 },
    { word: 'bike', translation: 'xe đạp', pronunciation: '/baɪk/', example: 'I ride my bike to school.', exampleTrans: 'Tôi đạp xe đến trường.', topic: 'transport', order: 3 },
    { word: 'motorbike', translation: 'xe máy', pronunciation: '/ˈmoʊtərbaɪk/', example: 'My brother rides a motorbike.', exampleTrans: 'Anh tôi đi xe máy.', topic: 'transport', order: 4 },
    { word: 'train', translation: 'tàu hỏa', pronunciation: '/treɪn/', example: 'We travel by train.', exampleTrans: 'Chúng tôi đi bằng tàu hỏa.', topic: 'transport', order: 5 },
    { word: 'plane', translation: 'máy bay', pronunciation: '/pleɪn/', example: 'We fly by plane.', exampleTrans: 'Chúng tôi đi bằng máy bay.', topic: 'transport', order: 6 },
    { word: 'ship', translation: 'tàu thủy', pronunciation: '/ʃɪp/', example: 'We travel by ship.', exampleTrans: 'Chúng tôi đi bằng tàu thủy.', topic: 'transport', order: 7 },
    { word: 'turn left', translation: 'rẽ trái', pronunciation: '/tɜːrn left/', example: 'Turn left at the traffic lights.', exampleTrans: 'Rẽ trái ở đèn giao thông.', topic: 'directions', order: 8 },
    { word: 'turn right', translation: 'rẽ phải', pronunciation: '/tɜːrn raɪt/', example: 'Turn right at the corner.', exampleTrans: 'Rẽ phải ở góc đường.', topic: 'directions', order: 9 },
    { word: 'go straight', translation: 'đi thẳng', pronunciation: '/ɡoʊ streɪt/', example: 'Go straight ahead.', exampleTrans: 'Đi thẳng về phía trước.', topic: 'directions', order: 10 },
  ]);

  // ── Unit 4: Jobs & Hobbies ─────────────────────────────────────────────────
  const u4 = `${G}-u4`;
  await upsertSet({ id: u4, title: 'Unit 4: Jobs & Hobbies — Nghề nghiệp và Sở thích', parentId: G, level: 'A1',
    description: 'Từ vựng về các nghề nghiệp và sở thích', createdBy: adminId });
  await upsertItems(u4, [
    { word: 'doctor', translation: 'bác sĩ', pronunciation: '/ˈdɑːktər/', example: 'My mother is a doctor.', exampleTrans: 'Mẹ tôi là bác sĩ.', topic: 'jobs', order: 1 },
    { word: 'nurse', translation: 'y tá', pronunciation: '/nɜːrs/', example: 'The nurse helps patients.', exampleTrans: 'Y tá giúp đỡ bệnh nhân.', topic: 'jobs', order: 2 },
    { word: 'teacher', translation: 'giáo viên', pronunciation: '/ˈtiːtʃər/', example: 'My teacher is very helpful.', exampleTrans: 'Giáo viên của tôi rất nhiệt tình.', topic: 'jobs', order: 3 },
    { word: 'engineer', translation: 'kỹ sư', pronunciation: '/ˌendʒɪˈnɪr/', example: 'My father is an engineer.', exampleTrans: 'Bố tôi là kỹ sư.', topic: 'jobs', order: 4 },
    { word: 'farmer', translation: 'nông dân', pronunciation: '/ˈfɑːrmər/', example: 'Farmers grow rice and vegetables.', exampleTrans: 'Nông dân trồng lúa và rau.', topic: 'jobs', order: 5 },
    { word: 'pilot', translation: 'phi công', pronunciation: '/ˈpaɪlət/', example: 'I want to be a pilot.', exampleTrans: 'Tôi muốn trở thành phi công.', topic: 'jobs', order: 6 },
    { word: 'cooking', translation: 'nấu ăn', pronunciation: '/ˈkʊkɪŋ/', example: 'My hobby is cooking.', exampleTrans: 'Sở thích của tôi là nấu ăn.', topic: 'hobbies', order: 7 },
    { word: 'gardening', translation: 'làm vườn', pronunciation: '/ˈɡɑːrdənɪŋ/', example: 'My grandfather likes gardening.', exampleTrans: 'Ông tôi thích làm vườn.', topic: 'hobbies', order: 8 },
    { word: 'painting', translation: 'vẽ tranh, tô màu', pronunciation: '/ˈpeɪntɪŋ/', example: 'She enjoys painting landscapes.', exampleTrans: 'Cô ấy thích vẽ phong cảnh.', topic: 'hobbies', order: 9 },
    { word: 'photography', translation: 'nhiếp ảnh', pronunciation: '/fəˈtɒɡrəfi/', example: 'Photography is his hobby.', exampleTrans: 'Nhiếp ảnh là sở thích của anh ấy.', topic: 'hobbies', order: 10 },
  ]);

  // ── Unit 5: Shopping ───────────────────────────────────────────────────────
  const u5 = `${G}-u5`;
  await upsertSet({ id: u5, title: 'Unit 5: Shopping — Mua sắm', parentId: G, level: 'A1',
    description: 'Từ vựng về mua sắm, giá cả, quần áo', createdBy: adminId });
  await upsertItems(u5, [
    { word: 'shop', translation: 'cửa hàng / mua sắm', pronunciation: '/ʃɒp/', example: 'I go shopping with my mum.', exampleTrans: 'Tôi đi mua sắm với mẹ.', topic: 'shopping', order: 1 },
    { word: 'price', translation: 'giá cả', pronunciation: '/praɪs/', example: 'What is the price of this shirt?', exampleTrans: 'Giá của cái áo này là bao nhiêu?', topic: 'shopping', order: 2 },
    { word: 'cheap', translation: 'rẻ', pronunciation: '/tʃiːp/', example: 'This pen is very cheap.', exampleTrans: 'Cây bút này rất rẻ.', topic: 'shopping', order: 3 },
    { word: 'expensive', translation: 'đắt', pronunciation: '/ɪkˈspensɪv/', example: 'That bag is too expensive.', exampleTrans: 'Cái túi đó đắt quá.', topic: 'shopping', order: 4 },
    { word: 'shirt', translation: 'áo sơ mi', pronunciation: '/ʃɜːrt/', example: 'He wears a white shirt.', exampleTrans: 'Anh ấy mặc áo sơ mi trắng.', topic: 'clothes', order: 5 },
    { word: 'dress', translation: 'váy đầm', pronunciation: '/dres/', example: 'She wears a beautiful dress.', exampleTrans: 'Cô ấy mặc một chiếc váy đẹp.', topic: 'clothes', order: 6 },
    { word: 'trousers', translation: 'quần dài', pronunciation: '/ˈtraʊzərz/', example: 'I wear trousers to school.', exampleTrans: 'Tôi mặc quần dài đến trường.', topic: 'clothes', order: 7 },
    { word: 'shoes', translation: 'giày', pronunciation: '/ʃuːz/', example: 'My shoes are black.', exampleTrans: 'Giày của tôi màu đen.', topic: 'clothes', order: 8 },
    { word: 'hat', translation: 'mũ (rộng vành)', pronunciation: '/hæt/', example: 'She wears a hat in the sun.', exampleTrans: 'Cô ấy đội mũ khi ra nắng.', topic: 'clothes', order: 9 },
    { word: 'buy', translation: 'mua', pronunciation: '/baɪ/', example: 'I want to buy a new book.', exampleTrans: 'Tôi muốn mua một cuốn sách mới.', topic: 'shopping', order: 10 },
  ]);

  // ── Unit 6: Health & Body ──────────────────────────────────────────────────
  const u6 = `${G}-u6`;
  await upsertSet({ id: u6, title: 'Unit 6: Health & Body — Sức khỏe', parentId: G, level: 'A1',
    description: 'Từ vựng về sức khỏe, bệnh tật và cơ thể', createdBy: adminId });
  await upsertItems(u6, [
    { word: 'healthy', translation: 'khỏe mạnh', pronunciation: '/ˈhelθi/', example: 'I want to be healthy.', exampleTrans: 'Tôi muốn khỏe mạnh.', topic: 'health', order: 1 },
    { word: 'sick', translation: 'ốm, bệnh', pronunciation: '/sɪk/', example: 'I am sick today.', exampleTrans: 'Hôm nay tôi bị ốm.', topic: 'health', order: 2 },
    { word: 'headache', translation: 'đau đầu', pronunciation: '/ˈhedeɪk/', example: 'I have a headache.', exampleTrans: 'Tôi bị đau đầu.', topic: 'health', order: 3 },
    { word: 'stomachache', translation: 'đau bụng', pronunciation: '/ˈstʌməkeɪk/', example: 'She has a stomachache.', exampleTrans: 'Cô ấy bị đau bụng.', topic: 'health', order: 4 },
    { word: 'toothache', translation: 'đau răng', pronunciation: '/ˈtuːθeɪk/', example: 'He has a toothache.', exampleTrans: 'Anh ấy bị đau răng.', topic: 'health', order: 5 },
    { word: 'fever', translation: 'sốt', pronunciation: '/ˈfiːvər/', example: 'I have a fever.', exampleTrans: 'Tôi bị sốt.', topic: 'health', order: 6 },
    { word: 'cough', translation: 'ho', pronunciation: '/kɒf/', example: 'She has a bad cough.', exampleTrans: 'Cô ấy ho nặng.', topic: 'health', order: 7 },
    { word: 'medicine', translation: 'thuốc', pronunciation: '/ˈmedɪsɪn/', example: 'Take your medicine.', exampleTrans: 'Uống thuốc đi.', topic: 'health', order: 8 },
    { word: 'rest', translation: 'nghỉ ngơi', pronunciation: '/rest/', example: 'You should rest at home.', exampleTrans: 'Bạn nên nghỉ ngơi ở nhà.', topic: 'health', order: 9 },
    { word: 'exercise', translation: 'tập thể dục', pronunciation: '/ˈeksərsaɪz/', example: 'Exercise every day to stay healthy.', exampleTrans: 'Tập thể dục mỗi ngày để giữ sức khỏe.', topic: 'health', order: 10 },
  ]);

  console.log('  ✅ Lớp 4 xong — 6 bộ từ vựng');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LỚP 5
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGrade5(adminId: string) {
  console.log('  📕 Lớp 5...');
  const G = 'kntt-en-g5';

  await upsertSet({ id: G, title: 'Tiếng Anh Lớp 5 — KNTT', level: 'A2',
    description: `Từ vựng Tiếng Anh lớp 5 theo bộ sách ${TEXTBOOK}`, createdBy: adminId });

  // ── Unit 1: My Address ─────────────────────────────────────────────────────
  const u1 = `${G}-u1`;
  await upsertSet({ id: u1, title: 'Unit 1: My Address — Địa chỉ', parentId: G, level: 'A2',
    description: 'Địa chỉ, hỏi đường và các địa điểm trong thành phố', createdBy: adminId });
  await upsertItems(u1, [
    { word: 'address', translation: 'địa chỉ', pronunciation: '/ˈædres/', example: 'What is your address?', exampleTrans: 'Địa chỉ của bạn là gì?', topic: 'location', order: 1 },
    { word: 'city', translation: 'thành phố', pronunciation: '/ˈsɪti/', example: 'I live in a big city.', exampleTrans: 'Tôi sống ở một thành phố lớn.', topic: 'location', order: 2 },
    { word: 'town', translation: 'thị trấn', pronunciation: '/taʊn/', example: 'My grandparents live in a small town.', exampleTrans: 'Ông bà tôi sống ở một thị trấn nhỏ.', topic: 'location', order: 3 },
    { word: 'village', translation: 'làng, thôn', pronunciation: '/ˈvɪlɪdʒ/', example: 'I was born in a village.', exampleTrans: 'Tôi sinh ra ở một làng quê.', topic: 'location', order: 4 },
    { word: 'museum', translation: 'bảo tàng', pronunciation: '/mjuˈziːəm/', example: 'We visited the history museum.', exampleTrans: 'Chúng tôi tham quan bảo tàng lịch sử.', topic: 'places', order: 5 },
    { word: 'cinema', translation: 'rạp chiếu phim', pronunciation: '/ˈsɪnəmə/', example: 'Let\'s go to the cinema tonight.', exampleTrans: 'Tối nay chúng ta đi xem phim nhé.', topic: 'places', order: 6 },
    { word: 'restaurant', translation: 'nhà hàng', pronunciation: '/ˈrestrɒnt/', example: 'We ate at a Vietnamese restaurant.', exampleTrans: 'Chúng tôi ăn ở nhà hàng Việt Nam.', topic: 'places', order: 7 },
    { word: 'airport', translation: 'sân bay', pronunciation: '/ˈerpɔːrt/', example: 'My uncle works at the airport.', exampleTrans: 'Chú tôi làm việc ở sân bay.', topic: 'places', order: 8 },
    { word: 'hotel', translation: 'khách sạn', pronunciation: '/hoʊˈtel/', example: 'We stayed at a hotel.', exampleTrans: 'Chúng tôi ở khách sạn.', topic: 'places', order: 9 },
    { word: 'opposite', translation: 'đối diện', pronunciation: '/ˈɒpəzɪt/', example: 'The bank is opposite the park.', exampleTrans: 'Ngân hàng đối diện công viên.', topic: 'directions', order: 10 },
    { word: 'between', translation: 'ở giữa', pronunciation: '/bɪˈtwiːn/', example: 'The shop is between the school and the hospital.', exampleTrans: 'Cửa hàng ở giữa trường học và bệnh viện.', topic: 'directions', order: 11 },
  ]);

  // ── Unit 2: Free Time Activities ───────────────────────────────────────────
  const u2 = `${G}-u2`;
  await upsertSet({ id: u2, title: 'Unit 2: Free Time — Hoạt động giải trí', parentId: G, level: 'A2',
    description: 'Hoạt động thời gian rảnh, sở thích nâng cao', createdBy: adminId });
  await upsertItems(u2, [
    { word: 'chess', translation: 'cờ vua', pronunciation: '/tʃes/', example: 'I play chess with my father.', exampleTrans: 'Tôi chơi cờ vua với bố.', topic: 'hobbies', order: 1 },
    { word: 'collect', translation: 'sưu tập', pronunciation: '/kəˈlekt/', example: 'I collect stamps.', exampleTrans: 'Tôi sưu tập tem.', topic: 'hobbies', order: 2 },
    { word: 'stamp', translation: 'con tem', pronunciation: '/stæmp/', example: 'He has many stamps.', exampleTrans: 'Anh ấy có nhiều con tem.', topic: 'hobbies', order: 3 },
    { word: 'video games', translation: 'trò chơi điện tử', pronunciation: '/ˈvɪdioʊ ɡeɪmz/', example: 'I play video games on weekends.', exampleTrans: 'Tôi chơi game vào cuối tuần.', topic: 'hobbies', order: 4 },
    { word: 'camping', translation: 'cắm trại', pronunciation: '/ˈkæmpɪŋ/', example: 'We go camping in summer.', exampleTrans: 'Chúng tôi đi cắm trại vào mùa hè.', topic: 'hobbies', order: 5 },
    { word: 'hiking', translation: 'đi bộ đường dài', pronunciation: '/ˈhaɪkɪŋ/', example: 'We went hiking in the mountains.', exampleTrans: 'Chúng tôi đi leo núi.', topic: 'hobbies', order: 6 },
    { word: 'skateboarding', translation: 'trượt ván', pronunciation: '/ˈskeɪtbɔːrdɪŋ/', example: 'He is good at skateboarding.', exampleTrans: 'Anh ấy giỏi trượt ván.', topic: 'hobbies', order: 7 },
    { word: 'enjoy', translation: 'thích thú, thưởng thức', pronunciation: '/ɪnˈdʒɔɪ/', example: 'I enjoy reading comics.', exampleTrans: 'Tôi thích đọc truyện tranh.', topic: 'hobbies', order: 8 },
    { word: 'prefer', translation: 'thích hơn', pronunciation: '/prɪˈfɜːr/', example: 'I prefer swimming to running.', exampleTrans: 'Tôi thích bơi hơn chạy.', topic: 'hobbies', order: 9 },
    { word: 'keen on', translation: 'hứng thú với', pronunciation: '/kiːn ɒn/', example: 'She is keen on painting.', exampleTrans: 'Cô ấy hứng thú với vẽ tranh.', topic: 'hobbies', order: 10 },
  ]);

  // ── Unit 3: Past Activities / Holidays ────────────────────────────────────
  const u3 = `${G}-u3`;
  await upsertSet({ id: u3, title: 'Unit 3: Past Holidays — Kỳ nghỉ hè', parentId: G, level: 'A2',
    description: 'Từ vựng về kỳ nghỉ, hoạt động quá khứ (Past Simple)', createdBy: adminId });
  await upsertItems(u3, [
    { word: 'holiday', translation: 'kỳ nghỉ', pronunciation: '/ˈhɒlɪdeɪ/', example: 'I had a great holiday.', exampleTrans: 'Tôi có một kỳ nghỉ tuyệt vời.', topic: 'holidays', order: 1 },
    { word: 'beach', translation: 'bãi biển', pronunciation: '/biːtʃ/', example: 'We swam at the beach.', exampleTrans: 'Chúng tôi bơi ở bãi biển.', topic: 'holidays', order: 2 },
    { word: 'mountain', translation: 'núi', pronunciation: '/ˈmaʊntən/', example: 'We climbed the mountain.', exampleTrans: 'Chúng tôi leo núi.', topic: 'holidays', order: 3 },
    { word: 'visited', translation: 'đã thăm', pronunciation: '/ˈvɪzɪtɪd/', example: 'I visited Hanoi last summer.', exampleTrans: 'Tôi đã thăm Hà Nội vào hè năm ngoái.', topic: 'past_tense', order: 4 },
    { word: 'travelled', translation: 'đã đi du lịch', pronunciation: '/ˈtrævəld/', example: 'We travelled by train.', exampleTrans: 'Chúng tôi đã đi du lịch bằng tàu hỏa.', topic: 'past_tense', order: 5 },
    { word: 'stayed', translation: 'đã ở lại', pronunciation: '/steɪd/', example: 'We stayed in a hotel.', exampleTrans: 'Chúng tôi đã ở trong khách sạn.', topic: 'past_tense', order: 6 },
    { word: 'enjoyed', translation: 'đã thích', pronunciation: '/ɪnˈdʒɔɪd/', example: 'We enjoyed the trip.', exampleTrans: 'Chúng tôi đã thích chuyến đi.', topic: 'past_tense', order: 7 },
    { word: 'last summer', translation: 'hè năm ngoái', pronunciation: '/læst ˈsʌmər/', example: 'Last summer I went to Da Nang.', exampleTrans: 'Hè năm ngoái tôi đến Đà Nẵng.', topic: 'time', order: 8 },
    { word: 'last year', translation: 'năm ngoái', pronunciation: '/læst jɪr/', example: 'Last year I visited Ho Chi Minh City.', exampleTrans: 'Năm ngoái tôi thăm thành phố Hồ Chí Minh.', topic: 'time', order: 9 },
    { word: 'wonderful', translation: 'tuyệt vời', pronunciation: '/ˈwʌndərfəl/', example: 'It was a wonderful experience.', exampleTrans: 'Đó là một trải nghiệm tuyệt vời.', topic: 'adjectives', order: 10 },
  ]);

  // ── Unit 4: Future Plans ───────────────────────────────────────────────────
  const u4 = `${G}-u4`;
  await upsertSet({ id: u4, title: 'Unit 4: Future Plans — Kế hoạch tương lai', parentId: G, level: 'A2',
    description: 'Từ vựng về kế hoạch tương lai, nghề nghiệp mơ ước (will/going to)', createdBy: adminId });
  await upsertItems(u4, [
    { word: 'astronaut', translation: 'phi hành gia', pronunciation: '/ˈæstrənɔːt/', example: 'I want to be an astronaut.', exampleTrans: 'Tôi muốn trở thành phi hành gia.', topic: 'jobs', order: 1 },
    { word: 'scientist', translation: 'nhà khoa học', pronunciation: '/ˈsaɪəntɪst/', example: 'She wants to be a scientist.', exampleTrans: 'Cô ấy muốn trở thành nhà khoa học.', topic: 'jobs', order: 2 },
    { word: 'programmer', translation: 'lập trình viên', pronunciation: '/ˈproʊɡræmər/', example: 'He will be a programmer.', exampleTrans: 'Anh ấy sẽ trở thành lập trình viên.', topic: 'jobs', order: 3 },
    { word: 'artist', translation: 'nghệ sĩ', pronunciation: '/ˈɑːrtɪst/', example: 'My sister is going to be an artist.', exampleTrans: 'Chị tôi sẽ trở thành nghệ sĩ.', topic: 'jobs', order: 4 },
    { word: 'vet', translation: 'bác sĩ thú y', pronunciation: '/vet/', example: 'I am going to be a vet.', exampleTrans: 'Tôi sẽ trở thành bác sĩ thú y.', topic: 'jobs', order: 5 },
    { word: 'plan', translation: 'kế hoạch / lên kế hoạch', pronunciation: '/plæn/', example: 'What are your plans for the weekend?', exampleTrans: 'Kế hoạch cuối tuần của bạn là gì?', topic: 'future', order: 6 },
    { word: 'travel', translation: 'du lịch, đi lại', pronunciation: '/ˈtrævəl/', example: 'I will travel around the world.', exampleTrans: 'Tôi sẽ du lịch vòng quanh thế giới.', topic: 'future', order: 7 },
    { word: 'university', translation: 'trường đại học', pronunciation: '/ˌjuːnɪˈvɜːrsɪti/', example: 'I will go to university.', exampleTrans: 'Tôi sẽ vào đại học.', topic: 'future', order: 8 },
    { word: 'dream', translation: 'ước mơ', pronunciation: '/driːm/', example: 'My dream is to help others.', exampleTrans: 'Ước mơ của tôi là giúp đỡ người khác.', topic: 'future', order: 9 },
    { word: 'hope', translation: 'hy vọng', pronunciation: '/hoʊp/', example: 'I hope to be successful.', exampleTrans: 'Tôi hy vọng sẽ thành công.', topic: 'future', order: 10 },
  ]);

  // ── Unit 5: Festivals ──────────────────────────────────────────────────────
  const u5 = `${G}-u5`;
  await upsertSet({ id: u5, title: 'Unit 5: Festivals Around the World — Lễ hội', parentId: G, level: 'A2',
    description: 'Các lễ hội trên thế giới và Việt Nam', createdBy: adminId });
  await upsertItems(u5, [
    { word: 'festival', translation: 'lễ hội', pronunciation: '/ˈfestɪvəl/', example: 'Tet is the biggest festival in Viet Nam.', exampleTrans: 'Tết là lễ hội lớn nhất ở Việt Nam.', topic: 'festivals', order: 1 },
    { word: 'celebrate', translation: 'kỷ niệm, tổ chức lễ', pronunciation: '/ˈselɪbreɪt/', example: 'We celebrate Tet with our family.', exampleTrans: 'Chúng tôi đón Tết cùng gia đình.', topic: 'festivals', order: 2 },
    { word: 'fireworks', translation: 'pháo hoa', pronunciation: '/ˈfaɪərwɜːrks/', example: 'We watch fireworks at midnight.', exampleTrans: 'Chúng tôi xem pháo hoa lúc nửa đêm.', topic: 'festivals', order: 3 },
    { word: 'lantern', translation: 'đèn lồng', pronunciation: '/ˈlæntərn/', example: 'Children carry lanterns at Mid-Autumn.', exampleTrans: 'Trẻ em rước đèn lồng vào Tết Trung thu.', topic: 'festivals', order: 4 },
    { word: 'costume', translation: 'trang phục (lễ hội)', pronunciation: '/ˈkɒstjuːm/', example: 'People wear traditional costumes.', exampleTrans: 'Mọi người mặc trang phục truyền thống.', topic: 'festivals', order: 5 },
    { word: 'parade', translation: 'lễ diễu hành', pronunciation: '/pəˈreɪd/', example: 'There is a parade in the street.', exampleTrans: 'Có lễ diễu hành trên phố.', topic: 'festivals', order: 6 },
    { word: 'Christmas', translation: 'Lễ Giáng sinh', pronunciation: '/ˈkrɪsməs/', example: 'Christmas is on 25th December.', exampleTrans: 'Lễ Giáng sinh vào ngày 25 tháng 12.', topic: 'festivals', order: 7 },
    { word: 'New Year', translation: 'Năm mới', pronunciation: '/njuː jɪr/', example: 'Happy New Year!', exampleTrans: 'Chúc mừng năm mới!', topic: 'festivals', order: 8 },
    { word: 'Mid-Autumn', translation: 'Tết Trung thu', pronunciation: '/mɪd ˈɔːtəm/', example: 'Mid-Autumn is the children\'s festival.', exampleTrans: 'Tết Trung thu là tết thiếu nhi.', topic: 'festivals', order: 9 },
    { word: 'tradition', translation: 'truyền thống', pronunciation: '/trəˈdɪʃən/', example: 'This is a Vietnamese tradition.', exampleTrans: 'Đây là truyền thống của Việt Nam.', topic: 'festivals', order: 10 },
    { word: 'gift', translation: 'món quà', pronunciation: '/ɡɪft/', example: 'I give gifts to my friends.', exampleTrans: 'Tôi tặng quà cho bạn bè.', topic: 'festivals', order: 11 },
  ]);

  // ── Unit 6: Environment ────────────────────────────────────────────────────
  const u6 = `${G}-u6`;
  await upsertSet({ id: u6, title: 'Unit 6: Our Environment — Môi trường', parentId: G, level: 'A2',
    description: 'Từ vựng về môi trường, thiên nhiên và bảo vệ Trái đất', createdBy: adminId });
  await upsertItems(u6, [
    { word: 'environment', translation: 'môi trường', pronunciation: '/ɪnˈvaɪrənmənt/', example: 'We must protect the environment.', exampleTrans: 'Chúng ta phải bảo vệ môi trường.', topic: 'environment', order: 1 },
    { word: 'pollution', translation: 'ô nhiễm', pronunciation: '/pəˈluːʃən/', example: 'Air pollution is a big problem.', exampleTrans: 'Ô nhiễm không khí là vấn đề lớn.', topic: 'environment', order: 2 },
    { word: 'recycle', translation: 'tái chế', pronunciation: '/ˌriːˈsaɪkəl/', example: 'We should recycle waste.', exampleTrans: 'Chúng ta nên tái chế rác thải.', topic: 'environment', order: 3 },
    { word: 'plant', translation: 'trồng cây / cây cỏ', pronunciation: '/plænt/', example: 'Let\'s plant more trees.', exampleTrans: 'Hãy trồng thêm nhiều cây.', topic: 'environment', order: 4 },
    { word: 'save', translation: 'tiết kiệm, bảo tồn', pronunciation: '/seɪv/', example: 'Save electricity and water.', exampleTrans: 'Tiết kiệm điện và nước.', topic: 'environment', order: 5 },
    { word: 'forest', translation: 'rừng', pronunciation: '/ˈfɒrɪst/', example: 'Forests are the lungs of the Earth.', exampleTrans: 'Rừng là phổi của Trái đất.', topic: 'nature', order: 6 },
    { word: 'ocean', translation: 'đại dương', pronunciation: '/ˈoʊʃən/', example: 'The ocean is full of fish.', exampleTrans: 'Đại dương có rất nhiều cá.', topic: 'nature', order: 7 },
    { word: 'rubbish', translation: 'rác', pronunciation: '/ˈrʌbɪʃ/', example: 'Don\'t drop rubbish on the street.', exampleTrans: 'Đừng xả rác trên đường phố.', topic: 'environment', order: 8 },
    { word: 'clean', translation: 'sạch / dọn sạch', pronunciation: '/kliːn/', example: 'Keep our school clean.', exampleTrans: 'Giữ trường học sạch sẽ.', topic: 'environment', order: 9 },
    { word: 'protect', translation: 'bảo vệ', pronunciation: '/prəˈtekt/', example: 'We must protect wild animals.', exampleTrans: 'Chúng ta phải bảo vệ động vật hoang dã.', topic: 'environment', order: 10 },
  ]);

  // ── Unit 7: Natural Wonders ────────────────────────────────────────────────
  const u7 = `${G}-u7`;
  await upsertSet({ id: u7, title: 'Unit 7: Natural Wonders — Kỳ quan thiên nhiên', parentId: G, level: 'A2',
    description: 'Từ vựng về các kỳ quan thiên nhiên và địa lý', createdBy: adminId });
  await upsertItems(u7, [
    { word: 'waterfall', translation: 'thác nước', pronunciation: '/ˈwɔːtərfɔːl/', example: 'Niagara is a famous waterfall.', exampleTrans: 'Niagara là thác nước nổi tiếng.', topic: 'nature', order: 1 },
    { word: 'volcano', translation: 'núi lửa', pronunciation: '/vɒlˈkeɪnoʊ/', example: 'The volcano erupted last year.', exampleTrans: 'Núi lửa phun trào năm ngoái.', topic: 'nature', order: 2 },
    { word: 'desert', translation: 'sa mạc', pronunciation: '/ˈdezərt/', example: 'The Sahara is the largest desert.', exampleTrans: 'Sahara là sa mạc lớn nhất.', topic: 'nature', order: 3 },
    { word: 'island', translation: 'hòn đảo', pronunciation: '/ˈaɪlənd/', example: 'Phu Quoc is a beautiful island.', exampleTrans: 'Phú Quốc là một hòn đảo đẹp.', topic: 'nature', order: 4 },
    { word: 'cave', translation: 'hang động', pronunciation: '/keɪv/', example: 'Son Doong is the world\'s biggest cave.', exampleTrans: 'Sơn Đoòng là hang động lớn nhất thế giới.', topic: 'nature', order: 5 },
    { word: 'river', translation: 'sông', pronunciation: '/ˈrɪvər/', example: 'The Mekong River is very long.', exampleTrans: 'Sông Mê Kông rất dài.', topic: 'nature', order: 6 },
    { word: 'lake', translation: 'hồ', pronunciation: '/leɪk/', example: 'Hoan Kiem Lake is in Hanoi.', exampleTrans: 'Hồ Hoàn Kiếm ở Hà Nội.', topic: 'nature', order: 7 },
    { word: 'amazing', translation: 'tuyệt vời, kỳ diệu', pronunciation: '/əˈmeɪzɪŋ/', example: 'Ha Long Bay is amazing.', exampleTrans: 'Vịnh Hạ Long thật kỳ diệu.', topic: 'adjectives', order: 8 },
    { word: 'beautiful', translation: 'đẹp', pronunciation: '/ˈbjuːtɪfəl/', example: 'Viet Nam is a beautiful country.', exampleTrans: 'Việt Nam là đất nước xinh đẹp.', topic: 'adjectives', order: 9 },
    { word: 'famous', translation: 'nổi tiếng', pronunciation: '/ˈfeɪməs/', example: 'Ha Long Bay is famous worldwide.', exampleTrans: 'Vịnh Hạ Long nổi tiếng toàn thế giới.', topic: 'adjectives', order: 10 },
  ]);

  console.log('  ✅ Lớp 5 xong — 7 bộ từ vựng');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('🚀 Bắt đầu seed Tiếng Anh KNTT lớp 2–5...');
  const adminId = await getAdminId();
  await seedGrade2(adminId);
  await seedGrade3(adminId);
  await seedGrade4(adminId);
  await seedGrade5(adminId);
  console.log('✅ Hoàn tất seed Tiếng Anh KNTT lớp 2–5!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
