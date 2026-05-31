/**
 * Lang Gold Dataset — 300 từ tiếng Anh chuẩn dùng làm benchmark.
 * Mỗi từ có đầy đủ: word, translation, pronunciation (IPA),
 * example, exampleTrans, synonyms, hints (gợi nhớ tiếng Việt).
 *
 * Phân cấp:
 *   A1 — 100 từ cơ bản lớp 1-2 (chủ đề: gia đình, màu sắc, số đếm, cơ thể, thức ăn, đồ vật)
 *   A2 — 100 từ sơ cấp lớp 3-4 (chủ đề: trường học, thời tiết, phương tiện, nghề nghiệp, cảm xúc)
 *   B1 — 100 từ trung cấp lớp 5-6 (chủ đề: thiên nhiên, sức khoẻ, xã hội, khoa học, nghệ thuật)
 */

export interface LangWordItem {
  word: string;
  translation: string;
  pronunciation: string;
  example: string;
  exampleTrans: string;
  synonyms: string[];
  hints: string[];
}

export interface LangGoldSet {
  level: string;
  title: string;
  description: string;
  topic: string;
  words: LangWordItem[];
}

// ─── A1 — 100 từ cơ bản ──────────────────────────────────────────────────────

const A1_FAMILY: LangWordItem[] = [
  { word: 'father', translation: 'bố, cha', pronunciation: '/ˈfɑːðər/', example: 'My father is a teacher.', exampleTrans: 'Bố tôi là giáo viên.', synonyms: ['dad', 'papa'], hints: ['Phát âm: "fa-đờ", chữ th đọc như đ', 'Hình ảnh: người đàn ông lớn tuổi trong gia đình'] },
  { word: 'mother', translation: 'mẹ, má', pronunciation: '/ˈmʌðər/', example: 'My mother cooks delicious food.', exampleTrans: 'Mẹ tôi nấu ăn ngon.', synonyms: ['mom', 'mama'], hints: ['Phát âm: "mơ-đờ"', 'Mẹ = mother, bắt đầu bằng M như Mẹ'] },
  { word: 'brother', translation: 'anh/em trai', pronunciation: '/ˈbrʌðər/', example: 'I have one brother.', exampleTrans: 'Tôi có một anh trai.', synonyms: ['sibling'], hints: ['Bro = anh bạn, brother = anh trai thật sự'] },
  { word: 'sister', translation: 'chị/em gái', pronunciation: '/ˈsɪstər/', example: 'My sister likes music.', exampleTrans: 'Em gái tôi thích âm nhạc.', synonyms: ['sibling'], hints: ['Sis = chị gái thân mật, sister là trang trọng hơn'] },
  { word: 'grandmother', translation: 'bà', pronunciation: '/ˈɡrænmʌðər/', example: 'My grandmother tells great stories.', exampleTrans: 'Bà tôi kể chuyện rất hay.', synonyms: ['grandma', 'nan'], hints: ['Grand = lớn/vĩ đại, grandmother = mẹ lớn'] },
  { word: 'grandfather', translation: 'ông', pronunciation: '/ˈɡrænfɑːðər/', example: 'Grandfather teaches me chess.', exampleTrans: 'Ông dạy tôi chơi cờ.', synonyms: ['grandpa', 'gramps'], hints: ['Grand + father = ông (bố lớn)'] },
  { word: 'baby', translation: 'em bé', pronunciation: '/ˈbeɪbi/', example: 'The baby is sleeping.', exampleTrans: 'Em bé đang ngủ.', synonyms: ['infant', 'newborn'], hints: ['Baby = bé, âm "bây-bi" giống "bé bỉm"'] },
  { word: 'family', translation: 'gia đình', pronunciation: '/ˈfæməli/', example: 'I love my family.', exampleTrans: 'Tôi yêu gia đình tôi.', synonyms: ['household', 'relatives'], hints: ['Fam = gia đình (từ lóng), family = gia đình chính thức'] },
];

const A1_COLORS: LangWordItem[] = [
  { word: 'red', translation: 'màu đỏ', pronunciation: '/red/', example: 'The apple is red.', exampleTrans: 'Quả táo màu đỏ.', synonyms: ['crimson', 'scarlet'], hints: ['Red = đỏ, ngắn và dễ nhớ như màu đỏ tươi'] },
  { word: 'blue', translation: 'màu xanh dương', pronunciation: '/bluː/', example: 'The sky is blue.', exampleTrans: 'Bầu trời màu xanh.', synonyms: ['azure', 'navy'], hints: ['Blue = xanh biển, âm "blu" như "bơi"'] },
  { word: 'green', translation: 'màu xanh lá', pronunciation: '/ɡriːn/', example: 'Leaves are green.', exampleTrans: 'Lá cây màu xanh.', synonyms: ['olive', 'emerald'], hints: ['Green như cây xanh, đọc là "grin"'] },
  { word: 'yellow', translation: 'màu vàng', pronunciation: '/ˈjeləʊ/', example: 'The sun is yellow.', exampleTrans: 'Mặt trời màu vàng.', synonyms: ['golden', 'amber'], hints: ['Yell = la hét, yellow = màu vàng rực rỡ như ánh nắng'] },
  { word: 'white', translation: 'màu trắng', pronunciation: '/waɪt/', example: 'Snow is white.', exampleTrans: 'Tuyết màu trắng.', synonyms: ['ivory', 'pale'], hints: ['White = trắng, âm "oa-iT"'] },
  { word: 'black', translation: 'màu đen', pronunciation: '/blæk/', example: 'The cat is black.', exampleTrans: 'Con mèo màu đen.', synonyms: ['dark', 'ebony'], hints: ['Black = đen, nghĩ đến màn đêm tối đen'] },
  { word: 'orange', translation: 'màu cam', pronunciation: '/ˈɒrɪndʒ/', example: 'Oranges are orange.', exampleTrans: 'Quả cam màu cam.', synonyms: ['amber'], hints: ['Orange = cam, vừa là màu vừa là trái cây!'] },
  { word: 'pink', translation: 'màu hồng', pronunciation: '/pɪŋk/', example: 'She likes pink flowers.', exampleTrans: 'Cô ấy thích hoa màu hồng.', synonyms: ['rose', 'magenta'], hints: ['Pink = hồng, âm ngắn dễ nhớ'] },
  { word: 'purple', translation: 'màu tím', pronunciation: '/ˈpɜːrpl/', example: 'Grapes are purple.', exampleTrans: 'Quả nho màu tím.', synonyms: ['violet', 'lavender'], hints: ['Purple = tím, nghĩ đến hoa oải hương tím'] },
  { word: 'brown', translation: 'màu nâu', pronunciation: '/braʊn/', example: 'Chocolate is brown.', exampleTrans: 'Sô cô la màu nâu.', synonyms: ['tan', 'chocolate'], hints: ['Brown = nâu, đọc "brao-n", nghĩ đến gỗ nâu'] },
];

const A1_NUMBERS: LangWordItem[] = [
  { word: 'one', translation: 'một', pronunciation: '/wʌn/', example: 'I have one cat.', exampleTrans: 'Tôi có một con mèo.', synonyms: ['single', 'solo'], hints: ['One = 1, đọc "oan"'] },
  { word: 'two', translation: 'hai', pronunciation: '/tuː/', example: 'I have two hands.', exampleTrans: 'Tôi có hai bàn tay.', synonyms: ['couple', 'pair'], hints: ['Two = 2, đọc "tu" như "tuổi"'] },
  { word: 'three', translation: 'ba', pronunciation: '/θriː/', example: 'She has three books.', exampleTrans: 'Cô ấy có ba cuốn sách.', synonyms: ['trio', 'triple'], hints: ['Three = 3, đọc "thri"'] },
  { word: 'four', translation: 'bốn', pronunciation: '/fɔːr/', example: 'A cat has four legs.', exampleTrans: 'Mèo có bốn chân.', synonyms: ['quartet'], hints: ['Four = 4, đọc "fo" như "fô"'] },
  { word: 'five', translation: 'năm', pronunciation: '/faɪv/', example: 'I have five fingers.', exampleTrans: 'Tôi có năm ngón tay.', synonyms: ['quint'], hints: ['Five = 5, đọc "fai-v"'] },
  { word: 'ten', translation: 'mười', pronunciation: '/ten/', example: 'There are ten students.', exampleTrans: 'Có mười học sinh.', synonyms: ['decade'], hints: ['Ten = 10, âm ngắn dễ nhớ'] },
  { word: 'hundred', translation: 'một trăm', pronunciation: '/ˈhʌndrəd/', example: 'There are a hundred days.', exampleTrans: 'Có một trăm ngày.', synonyms: ['century'], hints: ['Hundred = trăm, hun-đờ-rịt'] },
];

const A1_BODY: LangWordItem[] = [
  { word: 'eye', translation: 'mắt', pronunciation: '/aɪ/', example: 'She has brown eyes.', exampleTrans: 'Cô ấy có đôi mắt nâu.', synonyms: ['sight'], hints: ['Eye = mắt, đọc như "I" (tôi), mắt để nhìn chính mình'] },
  { word: 'nose', translation: 'mũi', pronunciation: '/nəʊz/', example: 'My nose is cold.', exampleTrans: 'Mũi tôi lạnh.', synonyms: ['snout'], hints: ['Nose = mũi, đọc "nô-z"'] },
  { word: 'mouth', translation: 'miệng', pronunciation: '/maʊθ/', example: 'Open your mouth.', exampleTrans: 'Hãy mở miệng ra.', synonyms: ['lips', 'oral'], hints: ['Mouth = miệng, đọc "mau-th"'] },
  { word: 'ear', translation: 'tai', pronunciation: '/ɪər/', example: 'I can hear with my ears.', exampleTrans: 'Tôi có thể nghe bằng tai.', synonyms: ['hearing'], hints: ['Ear = tai, bên trong có "ear" (nghe)'] },
  { word: 'hand', translation: 'bàn tay', pronunciation: '/hænd/', example: 'Wash your hands.', exampleTrans: 'Rửa tay đi.', synonyms: ['palm', 'fist'], hints: ['Hand = tay, đọc "hend"'] },
  { word: 'foot', translation: 'bàn chân', pronunciation: '/fʊt/', example: 'My foot hurts.', exampleTrans: 'Chân tôi đau.', synonyms: ['sole', 'base'], hints: ['Foot = bàn chân, feet là số nhiều'] },
  { word: 'head', translation: 'đầu', pronunciation: '/hed/', example: 'Put a hat on your head.', exampleTrans: 'Đội mũ lên đầu đi.', synonyms: ['skull', 'mind'], hints: ['Head = đầu, đọc "hed"'] },
  { word: 'hair', translation: 'tóc', pronunciation: '/heər/', example: 'She has long hair.', exampleTrans: 'Cô ấy có tóc dài.', synonyms: ['locks', 'tresses'], hints: ['Hair = tóc, đọc "heo"'] },
];

const A1_FOOD: LangWordItem[] = [
  { word: 'apple', translation: 'quả táo', pronunciation: '/ˈæpəl/', example: 'I eat an apple every day.', exampleTrans: 'Tôi ăn một quả táo mỗi ngày.', synonyms: ['fruit'], hints: ['Apple = táo, "An apple a day keeps the doctor away"'] },
  { word: 'banana', translation: 'quả chuối', pronunciation: '/bəˈnɑːnə/', example: 'Monkeys love bananas.', exampleTrans: 'Khỉ rất thích chuối.', synonyms: ['plantain'], hints: ['Banana = chuối, đọc "bờ-nah-nờ"'] },
  { word: 'rice', translation: 'cơm, gạo', pronunciation: '/raɪs/', example: 'We eat rice every day.', exampleTrans: 'Chúng tôi ăn cơm mỗi ngày.', synonyms: ['grain'], hints: ['Rice = gạo/cơm, đọc "rai-s"'] },
  { word: 'water', translation: 'nước', pronunciation: '/ˈwɔːtər/', example: 'Drink more water.', exampleTrans: 'Uống nhiều nước hơn.', synonyms: ['H2O', 'liquid'], hints: ['Water = nước, wa-tờ'] },
  { word: 'milk', translation: 'sữa', pronunciation: '/mɪlk/', example: 'Cows give us milk.', exampleTrans: 'Bò cho chúng ta sữa.', synonyms: ['dairy'], hints: ['Milk = sữa, đọc "milk"'] },
  { word: 'egg', translation: 'trứng', pronunciation: '/eɡ/', example: 'She eats an egg for breakfast.', exampleTrans: 'Cô ấy ăn một quả trứng vào bữa sáng.', synonyms: ['ovum'], hints: ['Egg = trứng, ngắn và dễ nhớ'] },
  { word: 'bread', translation: 'bánh mì', pronunciation: '/bred/', example: 'I eat bread for breakfast.', exampleTrans: 'Tôi ăn bánh mì vào buổi sáng.', synonyms: ['loaf', 'toast'], hints: ['Bread = bánh mì, đọc "bred"'] },
  { word: 'fish', translation: 'cá', pronunciation: '/fɪʃ/', example: 'We eat fish for dinner.', exampleTrans: 'Chúng tôi ăn cá vào bữa tối.', synonyms: ['seafood'], hints: ['Fish = cá, đọc "fi-sh"'] },
  { word: 'meat', translation: 'thịt', pronunciation: '/miːt/', example: 'She cooks meat for lunch.', exampleTrans: 'Cô ấy nấu thịt cho bữa trưa.', synonyms: ['flesh', 'protein'], hints: ['Meat = thịt, đọc "mit"'] },
  { word: 'orange', translation: 'quả cam', pronunciation: '/ˈɒrɪndʒ/', example: 'I drink orange juice.', exampleTrans: 'Tôi uống nước cam.', synonyms: ['citrus'], hints: ['Orange = cam, vừa là màu sắc vừa là trái cây'] },
];

const A1_OBJECTS: LangWordItem[] = [
  { word: 'book', translation: 'sách, quyển sách', pronunciation: '/bʊk/', example: 'She reads a book every night.', exampleTrans: 'Cô ấy đọc sách mỗi tối.', synonyms: ['novel', 'text'], hints: ['Book = sách, đọc "buk"'] },
  { word: 'pen', translation: 'bút mực', pronunciation: '/pen/', example: 'Write with a pen.', exampleTrans: 'Hãy viết bằng bút mực.', synonyms: ['ballpoint', 'writing instrument'], hints: ['Pen = bút, đọc "pen"'] },
  { word: 'pencil', translation: 'bút chì', pronunciation: '/ˈpensəl/', example: 'Draw with a pencil.', exampleTrans: 'Vẽ bằng bút chì.', synonyms: ['graphite', 'lead pencil'], hints: ['Pencil = bút chì, PENcil có "pen" bên trong'] },
  { word: 'bag', translation: 'túi, cặp', pronunciation: '/bæɡ/', example: 'Put books in your bag.', exampleTrans: 'Bỏ sách vào cặp của bạn.', synonyms: ['sack', 'backpack'], hints: ['Bag = túi, đọc "beg"'] },
  { word: 'chair', translation: 'ghế', pronunciation: '/tʃeər/', example: 'Sit on the chair.', exampleTrans: 'Hãy ngồi lên ghế.', synonyms: ['seat', 'stool'], hints: ['Chair = ghế, đọc "che-ờ"'] },
  { word: 'table', translation: 'bàn', pronunciation: '/ˈteɪbl/', example: 'Put it on the table.', exampleTrans: 'Đặt nó lên bàn.', synonyms: ['desk', 'surface'], hints: ['Table = bàn, đọc "tây-bồ"'] },
  { word: 'door', translation: 'cửa', pronunciation: '/dɔːr/', example: 'Please close the door.', exampleTrans: 'Vui lòng đóng cửa lại.', synonyms: ['gate', 'entrance'], hints: ['Door = cửa, đọc "đo-ờ"'] },
  { word: 'window', translation: 'cửa sổ', pronunciation: '/ˈwɪndəʊ/', example: 'Open the window for fresh air.', exampleTrans: 'Mở cửa sổ để lấy không khí trong lành.', synonyms: ['pane', 'glass'], hints: ['Window = cửa sổ, Wind = gió, window có gió thổi qua'] },
  { word: 'clock', translation: 'đồng hồ treo tường', pronunciation: '/klɒk/', example: 'The clock shows 3 o\'clock.', exampleTrans: 'Đồng hồ chỉ 3 giờ.', synonyms: ['timepiece', 'timer'], hints: ['Clock = đồng hồ, tiếng tick-tock của đồng hồ'] },
  { word: 'car', translation: 'xe ô tô', pronunciation: '/kɑːr/', example: 'Father drives a car.', exampleTrans: 'Bố lái xe ô tô.', synonyms: ['automobile', 'vehicle'], hints: ['Car = xe ô tô, đọc "ka"'] },
  { word: 'house', translation: 'ngôi nhà', pronunciation: '/haʊs/', example: 'We live in a big house.', exampleTrans: 'Chúng tôi sống trong ngôi nhà lớn.', synonyms: ['home', 'building'], hints: ['House = nhà, đọc "hao-s"'] },
  { word: 'school', translation: 'trường học', pronunciation: '/skuːl/', example: 'Children go to school.', exampleTrans: 'Trẻ em đi học.', synonyms: ['academy', 'institution'], hints: ['School = trường, sku-l'] },
];

const A1_ANIMALS: LangWordItem[] = [
  { word: 'cat', translation: 'con mèo', pronunciation: '/kæt/', example: 'The cat is on the mat.', exampleTrans: 'Con mèo ở trên tấm thảm.', synonyms: ['kitten', 'feline'], hints: ['Cat = mèo, âm "ket" ngắn gọn'] },
  { word: 'dog', translation: 'con chó', pronunciation: '/dɒɡ/', example: 'The dog wags its tail.', exampleTrans: 'Con chó vẫy đuôi.', synonyms: ['puppy', 'canine'], hints: ['Dog = chó, đọc "đog"'] },
  { word: 'bird', translation: 'con chim', pronunciation: '/bɜːrd/', example: 'The bird sings in the morning.', exampleTrans: 'Con chim hót vào buổi sáng.', synonyms: ['fowl', 'avian'], hints: ['Bird = chim, đọc "bơ-d"'] },
  { word: 'fish', translation: 'con cá', pronunciation: '/fɪʃ/', example: 'The fish swims in the water.', exampleTrans: 'Con cá bơi trong nước.', synonyms: ['seafood', 'marine animal'], hints: ['Fish = cá, đọc "fi-sh"'] },
  { word: 'cow', translation: 'con bò', pronunciation: '/kaʊ/', example: 'The cow gives us milk.', exampleTrans: 'Con bò cho chúng ta sữa.', synonyms: ['cattle', 'bovine'], hints: ['Cow = bò, âm "kau"'] },
  { word: 'horse', translation: 'con ngựa', pronunciation: '/hɔːrs/', example: 'She rides a horse.', exampleTrans: 'Cô ấy cưỡi ngựa.', synonyms: ['steed', 'mare'], hints: ['Horse = ngựa, đọc "ho-s"'] },
  { word: 'pig', translation: 'con lợn', pronunciation: '/pɪɡ/', example: 'The pig rolls in the mud.', exampleTrans: 'Con lợn lăn trong bùn.', synonyms: ['swine', 'hog'], hints: ['Pig = lợn, đọc "pig"'] },
  { word: 'chicken', translation: 'con gà', pronunciation: '/ˈtʃɪkɪn/', example: 'The chicken lays eggs.', exampleTrans: 'Con gà đẻ trứng.', synonyms: ['hen', 'rooster', 'poultry'], hints: ['Chicken = gà, chi-kin'] },
  { word: 'duck', translation: 'con vịt', pronunciation: '/dʌk/', example: 'The duck swims in the pond.', exampleTrans: 'Con vịt bơi trên ao.', synonyms: ['drake', 'waterfowl'], hints: ['Duck = vịt, đọc "đắk"'] },
  { word: 'elephant', translation: 'con voi', pronunciation: '/ˈelɪfənt/', example: 'Elephants have long trunks.', exampleTrans: 'Voi có vòi dài.', synonyms: ['pachyderm'], hints: ['Elephant = voi, "el-ờ-phần-t", hình dung con voi khổng lồ'] },
  { word: 'monkey', translation: 'con khỉ', pronunciation: '/ˈmʌŋki/', example: 'Monkeys live in the jungle.', exampleTrans: 'Khỉ sống trong rừng nhiệt đới.', synonyms: ['ape', 'primate'], hints: ['Monkey = khỉ, mun-ki, khỉ hay làm trò monkey business'] },
  { word: 'rabbit', translation: 'con thỏ', pronunciation: '/ˈræbɪt/', example: 'The rabbit eats carrots.', exampleTrans: 'Con thỏ ăn cà rốt.', synonyms: ['bunny', 'hare'], hints: ['Rabbit = thỏ, reb-it, tai dài như "rabbit ears antenna"'] },
];

const A1_VERBS: LangWordItem[] = [
  { word: 'eat', translation: 'ăn', pronunciation: '/iːt/', example: 'I eat breakfast at 7 am.', exampleTrans: 'Tôi ăn sáng lúc 7 giờ.', synonyms: ['consume', 'have'], hints: ['Eat = ăn, đọc "it"'] },
  { word: 'drink', translation: 'uống', pronunciation: '/drɪŋk/', example: 'She drinks water every morning.', exampleTrans: 'Cô ấy uống nước mỗi buổi sáng.', synonyms: ['sip', 'gulp'], hints: ['Drink = uống, đọc "đrink"'] },
  { word: 'sleep', translation: 'ngủ', pronunciation: '/sliːp/', example: 'Children need to sleep 8 hours.', exampleTrans: 'Trẻ em cần ngủ 8 tiếng.', synonyms: ['rest', 'slumber'], hints: ['Sleep = ngủ, đọc "slip"'] },
  { word: 'run', translation: 'chạy', pronunciation: '/rʌn/', example: 'The boy runs fast.', exampleTrans: 'Cậu bé chạy rất nhanh.', synonyms: ['sprint', 'jog'], hints: ['Run = chạy, đọc "rân"'] },
  { word: 'walk', translation: 'đi bộ', pronunciation: '/wɔːk/', example: 'We walk to school.', exampleTrans: 'Chúng tôi đi bộ đến trường.', synonyms: ['stroll', 'march'], hints: ['Walk = đi bộ, w không đọc, đọc "wok"'] },
  { word: 'play', translation: 'chơi', pronunciation: '/pleɪ/', example: 'Children play in the park.', exampleTrans: 'Trẻ em chơi trong công viên.', synonyms: ['game', 'fun'], hints: ['Play = chơi, đọc "plây"'] },
  { word: 'read', translation: 'đọc', pronunciation: '/riːd/', example: 'I read books every day.', exampleTrans: 'Tôi đọc sách mỗi ngày.', synonyms: ['study', 'peruse'], hints: ['Read = đọc, đọc "rid"'] },
  { word: 'write', translation: 'viết', pronunciation: '/raɪt/', example: 'She writes a letter.', exampleTrans: 'Cô ấy viết một bức thư.', synonyms: ['compose', 'jot'], hints: ['Write = viết, w không đọc, đọc "rait"'] },
  { word: 'sing', translation: 'hát', pronunciation: '/sɪŋ/', example: 'She sings beautifully.', exampleTrans: 'Cô ấy hát rất hay.', synonyms: ['chant', 'hum'], hints: ['Sing = hát, đọc "sing"'] },
  { word: 'swim', translation: 'bơi', pronunciation: '/swɪm/', example: 'He swims every morning.', exampleTrans: 'Anh ấy bơi mỗi buổi sáng.', synonyms: ['dive', 'float'], hints: ['Swim = bơi, đọc "suim"'] },
];

// ─── A2 — 100 từ sơ cấp ──────────────────────────────────────────────────────

const A2_SCHOOL: LangWordItem[] = [
  { word: 'teacher', translation: 'giáo viên', pronunciation: '/ˈtiːtʃər/', example: 'Our teacher explains very well.', exampleTrans: 'Giáo viên của chúng tôi giảng rất hay.', synonyms: ['instructor', 'educator'], hints: ['Teach = dạy, teacher = người dạy học'] },
  { word: 'student', translation: 'học sinh, sinh viên', pronunciation: '/ˈstjuːdənt/', example: 'The student studies hard.', exampleTrans: 'Học sinh học rất chăm chỉ.', synonyms: ['pupil', 'learner'], hints: ['Study = học, student = người học'] },
  { word: 'classroom', translation: 'lớp học', pronunciation: '/ˈklɑːsruːm/', example: 'The classroom has 30 students.', exampleTrans: 'Lớp học có 30 học sinh.', synonyms: ['class', 'room'], hints: ['Class + room = phòng học'] },
  { word: 'homework', translation: 'bài tập về nhà', pronunciation: '/ˈhəʊmwɜːrk/', example: 'I finish my homework before dinner.', exampleTrans: 'Tôi làm xong bài tập trước bữa tối.', synonyms: ['assignment', 'task'], hints: ['Home + work = việc làm ở nhà'] },
  { word: 'exam', translation: 'kỳ thi', pronunciation: '/ɪɡˈzæm/', example: 'I passed the math exam.', exampleTrans: 'Tôi đã vượt qua kỳ thi toán.', synonyms: ['test', 'assessment'], hints: ['Exam = thi, đọc "ik-zem"'] },
  { word: 'library', translation: 'thư viện', pronunciation: '/ˈlaɪbrəri/', example: 'I study in the library.', exampleTrans: 'Tôi học ở thư viện.', synonyms: ['archive', 'reading room'], hints: ['Libra = cân bằng, library = nơi sách được cân bằng/sắp xếp'] },
  { word: 'dictionary', translation: 'từ điển', pronunciation: '/ˈdɪkʃəneri/', example: 'Look up the word in the dictionary.', exampleTrans: 'Tra từ trong từ điển.', synonyms: ['lexicon', 'glossary'], hints: ['Diction = lời nói, dictionary = sách về lời nói/từ ngữ'] },
  { word: 'notebook', translation: 'vở, sổ tay', pronunciation: '/ˈnəʊtbʊk/', example: 'Write notes in your notebook.', exampleTrans: 'Ghi chú vào vở của bạn.', synonyms: ['journal', 'notepad'], hints: ['Note + book = sách để ghi chú'] },
  { word: 'lesson', translation: 'bài học', pronunciation: '/ˈlesən/', example: 'Today\'s lesson is about animals.', exampleTrans: 'Bài học hôm nay về động vật.', synonyms: ['class', 'session'], hints: ['Lesson = bài học, les-sần'] },
  { word: 'question', translation: 'câu hỏi', pronunciation: '/ˈkwestʃən/', example: 'Ask a question if you don\'t understand.', exampleTrans: 'Hỏi nếu bạn không hiểu.', synonyms: ['query', 'inquiry'], hints: ['Quest = tìm kiếm, question = tìm kiếm câu trả lời'] },
  { word: 'answer', translation: 'câu trả lời', pronunciation: '/ˈɑːnsər/', example: 'Do you know the answer?', exampleTrans: 'Bạn có biết câu trả lời không?', synonyms: ['response', 'reply'], hints: ['Answer = câu trả lời, an-sờ'] },
  { word: 'grade', translation: 'điểm, lớp', pronunciation: '/ɡreɪd/', example: 'She got a good grade on the test.', exampleTrans: 'Cô ấy được điểm tốt trong bài kiểm tra.', synonyms: ['score', 'mark'], hints: ['Grade = điểm/lớp, đọc "grây-d"'] },
];

const A2_WEATHER: LangWordItem[] = [
  { word: 'sunny', translation: 'có nắng', pronunciation: '/ˈsʌni/', example: 'It is sunny today.', exampleTrans: 'Hôm nay trời nắng.', synonyms: ['bright', 'clear'], hints: ['Sun = mặt trời, sunny = có nắng'] },
  { word: 'rainy', translation: 'có mưa', pronunciation: '/ˈreɪni/', example: 'It is rainy outside.', exampleTrans: 'Bên ngoài trời đang mưa.', synonyms: ['wet', 'showery'], hints: ['Rain = mưa, rainy = có mưa'] },
  { word: 'cloudy', translation: 'nhiều mây', pronunciation: '/ˈklaʊdi/', example: 'The sky is cloudy today.', exampleTrans: 'Bầu trời hôm nay nhiều mây.', synonyms: ['overcast', 'grey'], hints: ['Cloud = mây, cloudy = nhiều mây'] },
  { word: 'windy', translation: 'có gió', pronunciation: '/ˈwɪndi/', example: 'It is very windy today.', exampleTrans: 'Hôm nay rất nhiều gió.', synonyms: ['breezy', 'gusty'], hints: ['Wind = gió, windy = có gió'] },
  { word: 'cold', translation: 'lạnh', pronunciation: '/kəʊld/', example: 'The weather is cold in winter.', exampleTrans: 'Thời tiết lạnh vào mùa đông.', synonyms: ['cool', 'chilly'], hints: ['Cold = lạnh, đọc "cô-ld"'] },
  { word: 'hot', translation: 'nóng', pronunciation: '/hɒt/', example: 'Summer is very hot.', exampleTrans: 'Mùa hè rất nóng.', synonyms: ['warm', 'scorching'], hints: ['Hot = nóng, đọc "hot"'] },
  { word: 'snow', translation: 'tuyết', pronunciation: '/snəʊ/', example: 'Children play in the snow.', exampleTrans: 'Trẻ em chơi trong tuyết.', synonyms: ['sleet', 'frost'], hints: ['Snow = tuyết, sn-ô'] },
  { word: 'thunder', translation: 'sấm', pronunciation: '/ˈθʌndər/', example: 'The thunder was very loud.', exampleTrans: 'Tiếng sấm rất to.', synonyms: ['lightning', 'storm'], hints: ['Thunder = sấm, THUNDER nghe ầm ầm'] },
  { word: 'fog', translation: 'sương mù', pronunciation: '/fɒɡ/', example: 'There is fog in the morning.', exampleTrans: 'Có sương mù vào buổi sáng.', synonyms: ['mist', 'haze'], hints: ['Fog = sương mù, đọc "fog"'] },
  { word: 'storm', translation: 'bão', pronunciation: '/stɔːrm/', example: 'A big storm is coming.', exampleTrans: 'Một cơn bão lớn đang đến.', synonyms: ['hurricane', 'typhoon'], hints: ['Storm = bão, đọc "sto-m"'] },
];

const A2_TRANSPORT: LangWordItem[] = [
  { word: 'bus', translation: 'xe buýt', pronunciation: '/bʌs/', example: 'I take the bus to school.', exampleTrans: 'Tôi đi xe buýt đến trường.', synonyms: ['coach', 'vehicle'], hints: ['Bus = xe buýt, một chữ ngắn'] },
  { word: 'train', translation: 'tàu hỏa', pronunciation: '/treɪn/', example: 'The train is very fast.', exampleTrans: 'Tàu hỏa rất nhanh.', synonyms: ['railway', 'locomotive'], hints: ['Train = tàu hỏa, đọc "trên"'] },
  { word: 'plane', translation: 'máy bay', pronunciation: '/pleɪn/', example: 'We fly by plane.', exampleTrans: 'Chúng tôi đi máy bay.', synonyms: ['airplane', 'aircraft'], hints: ['Plane = máy bay, đọc "plên"'] },
  { word: 'bicycle', translation: 'xe đạp', pronunciation: '/ˈbaɪsɪkl/', example: 'She rides her bicycle to school.', exampleTrans: 'Cô ấy đạp xe đến trường.', synonyms: ['bike', 'cycle'], hints: ['Bi = hai, cycle = bánh xe, bicycle = hai bánh xe'] },
  { word: 'ship', translation: 'tàu thủy', pronunciation: '/ʃɪp/', example: 'The ship sails across the ocean.', exampleTrans: 'Con tàu đi qua đại dương.', synonyms: ['boat', 'vessel'], hints: ['Ship = tàu thủy, đọc "ship"'] },
  { word: 'taxi', translation: 'xe taxi', pronunciation: '/ˈtæksi/', example: 'We take a taxi to the airport.', exampleTrans: 'Chúng tôi đi taxi đến sân bay.', synonyms: ['cab', 'ride'], hints: ['Taxi = taxi, dùng được ngay không cần dịch!'] },
  { word: 'motorcycle', translation: 'xe máy', pronunciation: '/ˈməʊtəsaɪkl/', example: 'He rides a motorcycle to work.', exampleTrans: 'Anh ấy đi xe máy đến nơi làm việc.', synonyms: ['motorbike', 'scooter'], hints: ['Motor + cycle = xe chạy bằng động cơ'] },
  { word: 'road', translation: 'đường, con đường', pronunciation: '/rəʊd/', example: 'The road is very long.', exampleTrans: 'Con đường rất dài.', synonyms: ['street', 'highway'], hints: ['Road = đường, đọc "rô-d"'] },
];

const A2_JOBS: LangWordItem[] = [
  { word: 'doctor', translation: 'bác sĩ', pronunciation: '/ˈdɒktər/', example: 'The doctor helps sick people.', exampleTrans: 'Bác sĩ giúp đỡ người bệnh.', synonyms: ['physician', 'medic'], hints: ['Doctor = bác sĩ, đọc "đốc-tờ"'] },
  { word: 'nurse', translation: 'y tá', pronunciation: '/nɜːrs/', example: 'The nurse takes care of patients.', exampleTrans: 'Y tá chăm sóc bệnh nhân.', synonyms: ['caregiver', 'medic'], hints: ['Nurse = y tá, đọc "nơ-s"'] },
  { word: 'engineer', translation: 'kỹ sư', pronunciation: '/ˌendʒɪˈnɪər/', example: 'My father is an engineer.', exampleTrans: 'Bố tôi là kỹ sư.', synonyms: ['technician', 'builder'], hints: ['Engine = máy móc, engineer = người làm máy móc'] },
  { word: 'farmer', translation: 'nông dân', pronunciation: '/ˈfɑːrmər/', example: 'The farmer grows rice.', exampleTrans: 'Nông dân trồng lúa.', synonyms: ['cultivator', 'grower'], hints: ['Farm = nông trại, farmer = người làm nông'] },
  { word: 'police', translation: 'cảnh sát', pronunciation: '/pəˈliːs/', example: 'The police protect the city.', exampleTrans: 'Cảnh sát bảo vệ thành phố.', synonyms: ['officer', 'cop'], hints: ['Police = cảnh sát, đọc "pờ-li-s"'] },
  { word: 'cook', translation: 'đầu bếp, nấu ăn', pronunciation: '/kʊk/', example: 'The cook prepares delicious meals.', exampleTrans: 'Đầu bếp chuẩn bị những bữa ăn ngon.', synonyms: ['chef', 'baker'], hints: ['Cook = nấu ăn / đầu bếp, đọc "kuk"'] },
  { word: 'pilot', translation: 'phi công', pronunciation: '/ˈpaɪlət/', example: 'The pilot flies the plane.', exampleTrans: 'Phi công lái máy bay.', synonyms: ['aviator', 'captain'], hints: ['Pilot = phi công, đọc "pai-lật"'] },
  { word: 'soldier', translation: 'người lính', pronunciation: '/ˈsəʊldʒər/', example: 'Soldiers protect the country.', exampleTrans: 'Những người lính bảo vệ đất nước.', synonyms: ['warrior', 'military'], hints: ['Soldier = lính, đọc "sô-jờ"'] },
];

const A2_EMOTIONS: LangWordItem[] = [
  { word: 'happy', translation: 'vui vẻ, hạnh phúc', pronunciation: '/ˈhæpi/', example: 'I feel happy today.', exampleTrans: 'Hôm nay tôi cảm thấy vui.', synonyms: ['joyful', 'glad', 'cheerful'], hints: ['Happy = vui, đọc "hep-pi"'] },
  { word: 'sad', translation: 'buồn', pronunciation: '/sæd/', example: 'She looks sad today.', exampleTrans: 'Cô ấy trông có vẻ buồn hôm nay.', synonyms: ['unhappy', 'sorrowful'], hints: ['Sad = buồn, ngắn gọn như cảm giác buồn'] },
  { word: 'angry', translation: 'tức giận', pronunciation: '/ˈæŋɡri/', example: 'He is angry with his brother.', exampleTrans: 'Anh ấy tức giận với em trai.', synonyms: ['furious', 'mad'], hints: ['Anger = cơn tức, angry = đang tức giận'] },
  { word: 'scared', translation: 'sợ hãi', pronunciation: '/skeərd/', example: 'The child is scared of the dark.', exampleTrans: 'Đứa trẻ sợ bóng tối.', synonyms: ['afraid', 'frightened'], hints: ['Scare = làm sợ, scared = đang sợ'] },
  { word: 'excited', translation: 'hào hứng', pronunciation: '/ɪkˈsaɪtɪd/', example: 'She is excited about the trip.', exampleTrans: 'Cô ấy hào hứng về chuyến đi.', synonyms: ['thrilled', 'enthusiastic'], hints: ['Excite = làm hào hứng, excited = đang hào hứng'] },
  { word: 'tired', translation: 'mệt mỏi', pronunciation: '/ˈtaɪərd/', example: 'I am tired after a long day.', exampleTrans: 'Tôi mệt sau một ngày dài.', synonyms: ['exhausted', 'weary'], hints: ['Tire = mòn, tired = kiệt sức'] },
  { word: 'bored', translation: 'chán nản', pronunciation: '/bɔːrd/', example: 'He feels bored at home.', exampleTrans: 'Anh ấy cảm thấy chán ở nhà.', synonyms: ['uninterested', 'dull'], hints: ['Bore = nhàm chán, bored = đang chán'] },
  { word: 'surprised', translation: 'ngạc nhiên', pronunciation: '/səˈpraɪzd/', example: 'She was surprised by the gift.', exampleTrans: 'Cô ấy ngạc nhiên vì món quà.', synonyms: ['amazed', 'astonished'], hints: ['Surprise = bất ngờ, surprised = đang ngạc nhiên'] },
  { word: 'love', translation: 'tình yêu, yêu', pronunciation: '/lʌv/', example: 'I love my family very much.', exampleTrans: 'Tôi rất yêu gia đình mình.', synonyms: ['adore', 'cherish'], hints: ['Love = yêu, đọc "lâv"'] },
  { word: 'hope', translation: 'hy vọng', pronunciation: '/həʊp/', example: 'I hope the weather is nice tomorrow.', exampleTrans: 'Tôi hy vọng thời tiết đẹp ngày mai.', synonyms: ['wish', 'desire'], hints: ['Hope = hy vọng, đọc "hôp"'] },
];

const A2_TIME: LangWordItem[] = [
  { word: 'morning', translation: 'buổi sáng', pronunciation: '/ˈmɔːrnɪŋ/', example: 'I wake up early in the morning.', exampleTrans: 'Tôi thức dậy sớm vào buổi sáng.', synonyms: ['dawn', 'daybreak'], hints: ['Morning = buổi sáng, mo-ning'] },
  { word: 'afternoon', translation: 'buổi chiều', pronunciation: '/ˌɑːftərˈnuːn/', example: 'We play football in the afternoon.', exampleTrans: 'Chúng tôi chơi bóng đá vào buổi chiều.', synonyms: ['midday', 'noon'], hints: ['After + noon = sau 12 giờ trưa'] },
  { word: 'evening', translation: 'buổi tối (sớm)', pronunciation: '/ˈiːvnɪŋ/', example: 'We have dinner in the evening.', exampleTrans: 'Chúng tôi ăn tối vào buổi chiều tối.', synonyms: ['dusk', 'nightfall'], hints: ['Evening = chiều tối, eve-ning'] },
  { word: 'night', translation: 'ban đêm', pronunciation: '/naɪt/', example: 'Stars shine at night.', exampleTrans: 'Ngôi sao sáng vào ban đêm.', synonyms: ['darkness', 'midnight'], hints: ['Night = đêm, đọc "nai-t"'] },
  { word: 'yesterday', translation: 'hôm qua', pronunciation: '/ˈjestərdeɪ/', example: 'Yesterday was Monday.', exampleTrans: 'Hôm qua là thứ Hai.', synonyms: ['last day', 'the day before'], hints: ['Yester = ngày trước, yesterday = ngày hôm qua'] },
  { word: 'today', translation: 'hôm nay', pronunciation: '/təˈdeɪ/', example: 'Today is Tuesday.', exampleTrans: 'Hôm nay là thứ Ba.', synonyms: ['now', 'this day'], hints: ['To + day = ngày này = hôm nay'] },
  { word: 'tomorrow', translation: 'ngày mai', pronunciation: '/təˈmɒrəʊ/', example: 'I will do it tomorrow.', exampleTrans: 'Tôi sẽ làm điều đó vào ngày mai.', synonyms: ['next day', 'the following day'], hints: ['To + morrow = ngày tiếp theo = ngày mai'] },
  { word: 'week', translation: 'tuần', pronunciation: '/wiːk/', example: 'There are 7 days in a week.', exampleTrans: 'Có 7 ngày trong một tuần.', synonyms: ['seven days'], hints: ['Week = tuần, đọc "wik"'] },
  { word: 'month', translation: 'tháng', pronunciation: '/mʌnθ/', example: 'There are 12 months in a year.', exampleTrans: 'Có 12 tháng trong một năm.', synonyms: ['period', '30 days'], hints: ['Month = tháng, đọc "mânth"'] },
  { word: 'year', translation: 'năm', pronunciation: '/jɪər/', example: 'There are 365 days in a year.', exampleTrans: 'Có 365 ngày trong một năm.', synonyms: ['annum', '12 months'], hints: ['Year = năm, đọc "yia"'] },
];

const A2_ADJECTIVES: LangWordItem[] = [
  { word: 'big', translation: 'to, lớn', pronunciation: '/bɪɡ/', example: 'An elephant is very big.', exampleTrans: 'Một con voi rất to.', synonyms: ['large', 'huge'], hints: ['Big = to, ngắn gọn'] },
  { word: 'small', translation: 'nhỏ', pronunciation: '/smɔːl/', example: 'A mouse is very small.', exampleTrans: 'Con chuột rất nhỏ.', synonyms: ['little', 'tiny'], hints: ['Small = nhỏ, đọc "smo-l"'] },
  { word: 'fast', translation: 'nhanh', pronunciation: '/fɑːst/', example: 'A cheetah is very fast.', exampleTrans: 'Báo là loài vật rất nhanh.', synonyms: ['quick', 'swift'], hints: ['Fast = nhanh, đọc "fast"'] },
  { word: 'slow', translation: 'chậm', pronunciation: '/sləʊ/', example: 'A turtle is very slow.', exampleTrans: 'Rùa rất chậm.', synonyms: ['sluggish', 'leisurely'], hints: ['Slow = chậm, đọc "slô"'] },
  { word: 'tall', translation: 'cao', pronunciation: '/tɔːl/', example: 'He is very tall.', exampleTrans: 'Anh ấy rất cao.', synonyms: ['high', 'lofty'], hints: ['Tall = cao, đọc "to-l"'] },
  { word: 'short', translation: 'thấp, ngắn', pronunciation: '/ʃɔːrt/', example: 'She is short but strong.', exampleTrans: 'Cô ấy thấp nhưng mạnh mẽ.', synonyms: ['low', 'brief'], hints: ['Short = thấp/ngắn, đọc "sho-t"'] },
  { word: 'beautiful', translation: 'đẹp', pronunciation: '/ˈbjuːtɪfəl/', example: 'The flowers are beautiful.', exampleTrans: 'Những bông hoa rất đẹp.', synonyms: ['pretty', 'lovely'], hints: ['Beauty = vẻ đẹp, beautiful = đầy vẻ đẹp'] },
  { word: 'strong', translation: 'mạnh mẽ', pronunciation: '/strɒŋ/', example: 'He is very strong.', exampleTrans: 'Anh ấy rất mạnh mẽ.', synonyms: ['powerful', 'muscular'], hints: ['Strong = mạnh, đọc "strong"'] },
  { word: 'smart', translation: 'thông minh', pronunciation: '/smɑːrt/', example: 'She is a smart student.', exampleTrans: 'Cô ấy là học sinh thông minh.', synonyms: ['intelligent', 'clever'], hints: ['Smart = thông minh, đọc "smart"'] },
  { word: 'kind', translation: 'tốt bụng', pronunciation: '/kaɪnd/', example: 'The teacher is very kind.', exampleTrans: 'Giáo viên rất tốt bụng.', synonyms: ['generous', 'caring'], hints: ['Kind = tốt bụng, cũng có nghĩa là "loại"'] },
];

// ─── B1 — 100 từ trung cấp ────────────────────────────────────────────────────

const B1_NATURE: LangWordItem[] = [
  { word: 'mountain', translation: 'núi', pronunciation: '/ˈmaʊntɪn/', example: 'The mountain is covered with snow.', exampleTrans: 'Ngọn núi được bao phủ bởi tuyết.', synonyms: ['peak', 'summit', 'hill'], hints: ['Mount = leo lên, mountain = vật cần leo = núi'] },
  { word: 'ocean', translation: 'đại dương', pronunciation: '/ˈəʊʃən/', example: 'The ocean is very deep.', exampleTrans: 'Đại dương rất sâu.', synonyms: ['sea', 'deep'], hints: ['Ocean = đại dương, o-shần'] },
  { word: 'forest', translation: 'rừng', pronunciation: '/ˈfɒrɪst/', example: 'The forest is full of trees.', exampleTrans: 'Khu rừng đầy cây cối.', synonyms: ['jungle', 'woods'], hints: ['Forest = rừng, fo-rest'] },
  { word: 'river', translation: 'dòng sông', pronunciation: '/ˈrɪvər/', example: 'The river flows to the sea.', exampleTrans: 'Dòng sông chảy ra biển.', synonyms: ['stream', 'waterway'], hints: ['River = sông, ri-vờ'] },
  { word: 'desert', translation: 'sa mạc', pronunciation: '/ˈdezərt/', example: 'The Sahara is a huge desert.', exampleTrans: 'Sahara là sa mạc khổng lồ.', synonyms: ['wasteland', 'arid'], hints: ['Desert = sa mạc, đọc "đe-zơt"'] },
  { word: 'island', translation: 'hòn đảo', pronunciation: '/ˈaɪlənd/', example: 'They live on a small island.', exampleTrans: 'Họ sống trên một hòn đảo nhỏ.', synonyms: ['isle', 'atoll'], hints: ['Island = đảo, "i-lần", chữ s không đọc'] },
  { word: 'volcano', translation: 'núi lửa', pronunciation: '/vɒlˈkeɪnəʊ/', example: 'The volcano erupted last year.', exampleTrans: 'Núi lửa phun trào năm ngoái.', synonyms: ['crater', 'lava mountain'], hints: ['Vulcan = thần lửa La Mã, volcano = núi lửa'] },
  { word: 'earthquake', translation: 'động đất', pronunciation: '/ˈɜːrθkweɪk/', example: 'An earthquake hit the city.', exampleTrans: 'Một trận động đất tấn công thành phố.', synonyms: ['tremor', 'quake'], hints: ['Earth + quake = trái đất rung chuyển = động đất'] },
  { word: 'climate', translation: 'khí hậu', pronunciation: '/ˈklaɪmɪt/', example: 'The climate is changing rapidly.', exampleTrans: 'Khí hậu đang thay đổi nhanh chóng.', synonyms: ['weather pattern', 'environment'], hints: ['Climate = khí hậu, clai-mịt'] },
  { word: 'pollution', translation: 'ô nhiễm', pronunciation: '/pəˈluːʃən/', example: 'Air pollution is a big problem.', exampleTrans: 'Ô nhiễm không khí là vấn đề lớn.', synonyms: ['contamination', 'toxicity'], hints: ['Pollute = làm ô nhiễm, pollution = sự ô nhiễm'] },
  { word: 'endangered', translation: 'có nguy cơ tuyệt chủng', pronunciation: '/ɪnˈdeɪndʒərd/', example: 'Pandas are endangered animals.', exampleTrans: 'Gấu trúc là động vật có nguy cơ tuyệt chủng.', synonyms: ['threatened', 'at risk'], hints: ['Danger = nguy hiểm, endangered = đang trong nguy hiểm'] },
  { word: 'ecosystem', translation: 'hệ sinh thái', pronunciation: '/ˈiːkəʊsɪstəm/', example: 'The rainforest ecosystem is very diverse.', exampleTrans: 'Hệ sinh thái rừng mưa rất đa dạng.', synonyms: ['environment', 'habitat'], hints: ['Eco = môi trường, system = hệ thống, ecosystem = hệ thống môi trường'] },
];

const B1_HEALTH: LangWordItem[] = [
  { word: 'medicine', translation: 'thuốc, y học', pronunciation: '/ˈmedɪsɪn/', example: 'Take this medicine twice a day.', exampleTrans: 'Uống thuốc này hai lần mỗi ngày.', synonyms: ['drug', 'remedy', 'treatment'], hints: ['Medic = bác sĩ quân y, medicine = thuốc/y học'] },
  { word: 'hospital', translation: 'bệnh viện', pronunciation: '/ˈhɒspɪtl/', example: 'He went to the hospital for a check-up.', exampleTrans: 'Anh ấy đến bệnh viện để kiểm tra sức khỏe.', synonyms: ['clinic', 'medical center'], hints: ['Host = đón tiếp, hospital = nơi đón tiếp người bệnh'] },
  { word: 'exercise', translation: 'tập thể dục', pronunciation: '/ˈeksərsaɪz/', example: 'Exercise is good for your health.', exampleTrans: 'Tập thể dục tốt cho sức khỏe của bạn.', synonyms: ['workout', 'fitness', 'training'], hints: ['Exercise = tập thể dục, ex-ờ-sai-z'] },
  { word: 'nutrition', translation: 'dinh dưỡng', pronunciation: '/njuːˈtrɪʃən/', example: 'Good nutrition keeps you healthy.', exampleTrans: 'Dinh dưỡng tốt giúp bạn khỏe mạnh.', synonyms: ['diet', 'nourishment'], hints: ['Nutrient = chất dinh dưỡng, nutrition = dinh dưỡng'] },
  { word: 'symptom', translation: 'triệu chứng', pronunciation: '/ˈsɪmptəm/', example: 'Fever is a symptom of flu.', exampleTrans: 'Sốt là triệu chứng của cúm.', synonyms: ['sign', 'indicator'], hints: ['Symptom = triệu chứng, sim-tầm'] },
  { word: 'vaccine', translation: 'vắc-xin', pronunciation: '/ˈvæksiːn/', example: 'Children receive many vaccines.', exampleTrans: 'Trẻ em nhận nhiều loại vắc-xin.', synonyms: ['immunization', 'shot'], hints: ['Vaccine = vắc-xin, từ "vacca" (con bò) trong Latin'] },
  { word: 'surgery', translation: 'phẫu thuật', pronunciation: '/ˈsɜːrdʒəri/', example: 'The surgery was successful.', exampleTrans: 'Ca phẫu thuật thành công.', synonyms: ['operation', 'procedure'], hints: ['Surgeon = bác sĩ phẫu thuật, surgery = phẫu thuật'] },
  { word: 'allergy', translation: 'dị ứng', pronunciation: '/ˈælərdʒi/', example: 'She has an allergy to peanuts.', exampleTrans: 'Cô ấy bị dị ứng với đậu phộng.', synonyms: ['reaction', 'sensitivity'], hints: ['Allergy = dị ứng, al-ờ-ji'] },
  { word: 'mental', translation: 'tinh thần, tâm lý', pronunciation: '/ˈmentl/', example: 'Mental health is very important.', exampleTrans: 'Sức khỏe tâm thần rất quan trọng.', synonyms: ['psychological', 'emotional'], hints: ['Mental = tâm trí/tinh thần, men-tồ-l'] },
  { word: 'vitamin', translation: 'vitamin', pronunciation: '/ˈvaɪtəmɪn/', example: 'Oranges are rich in vitamin C.', exampleTrans: 'Cam giàu vitamin C.', synonyms: ['supplement', 'nutrient'], hints: ['Vita = sự sống, vitamin = chất sống'] },
];

const B1_SOCIETY: LangWordItem[] = [
  { word: 'government', translation: 'chính phủ', pronunciation: '/ˈɡʌvərnmənt/', example: 'The government makes laws.', exampleTrans: 'Chính phủ ban hành luật pháp.', synonyms: ['administration', 'authority'], hints: ['Govern = cai trị, government = tổ chức cai trị = chính phủ'] },
  { word: 'democracy', translation: 'dân chủ', pronunciation: '/dɪˈmɒkrəsi/', example: 'Democracy gives people a voice.', exampleTrans: 'Dân chủ cho phép người dân lên tiếng.', synonyms: ['republic', 'freedom'], hints: ['Demo = người dân, cracy = cai trị, democracy = người dân cai trị'] },
  { word: 'economy', translation: 'kinh tế', pronunciation: '/ɪˈkɒnəmi/', example: 'The economy is growing fast.', exampleTrans: 'Kinh tế đang tăng trưởng nhanh.', synonyms: ['finance', 'trade'], hints: ['Eco = nhà/quản lý, economy = quản lý tài sản quốc gia'] },
  { word: 'education', translation: 'giáo dục', pronunciation: '/ˌedʒuˈkeɪʃən/', example: 'Education is the key to success.', exampleTrans: 'Giáo dục là chìa khóa dẫn đến thành công.', synonyms: ['learning', 'schooling'], hints: ['Educate = giáo dục, education = nền giáo dục'] },
  { word: 'population', translation: 'dân số', pronunciation: '/ˌpɒpjuˈleɪʃən/', example: 'The world population is 8 billion.', exampleTrans: 'Dân số thế giới là 8 tỷ người.', synonyms: ['inhabitants', 'people'], hints: ['Popular = đông người, population = tổng số dân'] },
  { word: 'tradition', translation: 'truyền thống', pronunciation: '/trəˈdɪʃən/', example: 'This is an old tradition.', exampleTrans: 'Đây là một truyền thống lâu đời.', synonyms: ['custom', 'heritage'], hints: ['Tradition = truyền thống, tra-đi-shần'] },
  { word: 'volunteer', translation: 'tình nguyện viên', pronunciation: '/ˌvɒlənˈtɪər/', example: 'She is a volunteer at the hospital.', exampleTrans: 'Cô ấy là tình nguyện viên tại bệnh viện.', synonyms: ['helper', 'activist'], hints: ['Volunt = tự nguyện, volunteer = người tình nguyện'] },
  { word: 'poverty', translation: 'nghèo đói', pronunciation: '/ˈpɒvərti/', example: 'We must fight against poverty.', exampleTrans: 'Chúng ta phải đấu tranh chống đói nghèo.', synonyms: ['deprivation', 'hardship'], hints: ['Poor = nghèo, poverty = tình trạng nghèo đói'] },
  { word: 'justice', translation: 'công lý', pronunciation: '/ˈdʒʌstɪs/', example: 'Everyone deserves justice.', exampleTrans: 'Mọi người đều xứng đáng được hưởng công lý.', synonyms: ['fairness', 'law'], hints: ['Just = đúng, justice = sự công bằng'] },
  { word: 'equality', translation: 'bình đẳng', pronunciation: '/ɪˈkwɒlɪti/', example: 'Equality is a basic human right.', exampleTrans: 'Bình đẳng là quyền cơ bản của con người.', synonyms: ['fairness', 'parity'], hints: ['Equal = bằng nhau, equality = sự bình đẳng'] },
];

const B1_SCIENCE: LangWordItem[] = [
  { word: 'experiment', translation: 'thí nghiệm', pronunciation: '/ɪkˈsperɪmənt/', example: 'Scientists do experiments in labs.', exampleTrans: 'Các nhà khoa học làm thí nghiệm trong phòng thí nghiệm.', synonyms: ['test', 'trial', 'research'], hints: ['Experience + ment = trải nghiệm có chủ đích = thí nghiệm'] },
  { word: 'hypothesis', translation: 'giả thuyết', pronunciation: '/haɪˈpɒθɪsɪs/', example: 'The scientist tested her hypothesis.', exampleTrans: 'Nhà khoa học kiểm tra giả thuyết của mình.', synonyms: ['theory', 'assumption'], hints: ['Hypo = dưới, thesis = luận điểm, hypothesis = luận điểm ban đầu'] },
  { word: 'gravity', translation: 'trọng lực', pronunciation: '/ˈɡrævɪti/', example: 'Gravity keeps us on the ground.', exampleTrans: 'Trọng lực giữ chúng ta trên mặt đất.', synonyms: ['gravitational force', 'weight'], hints: ['Grave = nặng nề, gravity = lực kéo nặng xuống'] },
  { word: 'molecule', translation: 'phân tử', pronunciation: '/ˈmɒlɪkjuːl/', example: 'Water molecules are H2O.', exampleTrans: 'Phân tử nước là H2O.', synonyms: ['particle', 'compound'], hints: ['Mole = khối lượng, molecule = hạt nhỏ nhất của chất'] },
  { word: 'evolution', translation: 'tiến hóa', pronunciation: '/ˌiːvəˈluːʃən/', example: 'Darwin studied evolution.', exampleTrans: 'Darwin nghiên cứu về tiến hóa.', synonyms: ['development', 'change'], hints: ['Evolve = phát triển dần, evolution = quá trình tiến hóa'] },
  { word: 'technology', translation: 'công nghệ', pronunciation: '/tekˈnɒlədʒi/', example: 'Technology changes our lives.', exampleTrans: 'Công nghệ thay đổi cuộc sống của chúng ta.', synonyms: ['innovation', 'advancement'], hints: ['Techno = kỹ thuật, logy = khoa học, technology = khoa học kỹ thuật'] },
  { word: 'artificial', translation: 'nhân tạo', pronunciation: '/ˌɑːrtɪˈfɪʃəl/', example: 'Artificial intelligence is growing fast.', exampleTrans: 'Trí tuệ nhân tạo đang phát triển nhanh.', synonyms: ['synthetic', 'man-made'], hints: ['Art = nghệ thuật/tạo ra, artificial = do con người tạo ra'] },
  { word: 'renewable', translation: 'có thể tái tạo', pronunciation: '/rɪˈnjuːəbl/', example: 'Solar energy is renewable.', exampleTrans: 'Năng lượng mặt trời có thể tái tạo.', synonyms: ['sustainable', 'clean'], hints: ['Re = lại, new = mới, renewable = có thể làm mới lại'] },
  { word: 'digital', translation: 'kỹ thuật số', pronunciation: '/ˈdɪdʒɪtl/', example: 'We live in a digital world.', exampleTrans: 'Chúng ta sống trong thế giới kỹ thuật số.', synonyms: ['electronic', 'virtual'], hints: ['Digit = con số, digital = dùng con số (nhị phân)'] },
  { word: 'research', translation: 'nghiên cứu', pronunciation: '/ˈriːsɜːrtʃ/', example: 'She does research at the university.', exampleTrans: 'Cô ấy nghiên cứu tại trường đại học.', synonyms: ['study', 'investigation'], hints: ['Re = lại, search = tìm kiếm, research = tìm kiếm lại/sâu hơn'] },
];

const B1_ARTS: LangWordItem[] = [
  { word: 'literature', translation: 'văn học', pronunciation: '/ˈlɪtrətʃər/', example: 'She studies English literature.', exampleTrans: 'Cô ấy học văn học Anh.', synonyms: ['fiction', 'writing'], hints: ['Literate = biết chữ, literature = tác phẩm chữ nghĩa'] },
  { word: 'symphony', translation: 'giao hưởng', pronunciation: '/ˈsɪmfəni/', example: 'Beethoven wrote nine symphonies.', exampleTrans: 'Beethoven đã viết chín bản giao hưởng.', synonyms: ['orchestra', 'composition'], hints: ['Sym = cùng nhau, phony = âm thanh, symphony = âm thanh hài hòa cùng nhau'] },
  { word: 'sculpture', translation: 'điêu khắc, tác phẩm điêu khắc', pronunciation: '/ˈskʌlptʃər/', example: 'The sculpture was made of marble.', exampleTrans: 'Tác phẩm điêu khắc được làm từ đá cẩm thạch.', synonyms: ['statue', 'carving'], hints: ['Sculpt = chạm khắc, sculpture = tác phẩm chạm khắc'] },
  { word: 'architecture', translation: 'kiến trúc', pronunciation: '/ˈɑːrkɪtektʃər/', example: 'The architecture of Rome is amazing.', exampleTrans: 'Kiến trúc của Rome thật tuyệt vời.', synonyms: ['design', 'construction'], hints: ['Archi = chính, tech = kỹ thuật, architecture = kỹ thuật xây dựng chính'] },
  { word: 'photography', translation: 'nhiếp ảnh', pronunciation: '/fəˈtɒɡrəfi/', example: 'She loves photography as a hobby.', exampleTrans: 'Cô ấy yêu thích nhiếp ảnh như một sở thích.', synonyms: ['photo', 'imaging'], hints: ['Photo = ánh sáng, graphy = ghi chép, photography = ghi lại ánh sáng'] },
  { word: 'exhibition', translation: 'triển lãm', pronunciation: '/ˌeksɪˈbɪʃən/', example: 'There is an art exhibition this week.', exampleTrans: 'Tuần này có triển lãm nghệ thuật.', synonyms: ['show', 'display'], hints: ['Exhibit = trưng bày, exhibition = sự kiện trưng bày'] },
  { word: 'creativity', translation: 'sự sáng tạo', pronunciation: '/ˌkriːeɪˈtɪvɪti/', example: 'Creativity is important in art.', exampleTrans: 'Sự sáng tạo rất quan trọng trong nghệ thuật.', synonyms: ['imagination', 'innovation'], hints: ['Create = tạo ra, creativity = khả năng tạo ra điều mới'] },
  { word: 'performance', translation: 'buổi biểu diễn', pronunciation: '/pərˈfɔːrməns/', example: 'The performance was outstanding.', exampleTrans: 'Buổi biểu diễn thật xuất sắc.', synonyms: ['show', 'concert', 'presentation'], hints: ['Perform = thực hiện/biểu diễn, performance = buổi biểu diễn'] },
];

const B1_BUSINESS: LangWordItem[] = [
  { word: 'investment', translation: 'đầu tư', pronunciation: '/ɪnˈvestmənt/', example: 'Education is a good investment.', exampleTrans: 'Giáo dục là khoản đầu tư tốt.', synonyms: ['capital', 'funding'], hints: ['Invest = đầu tư, investment = khoản/hành động đầu tư'] },
  { word: 'entrepreneur', translation: 'doanh nhân, người khởi nghiệp', pronunciation: '/ˌɒntrəprəˈnɜːr/', example: 'She is a successful entrepreneur.', exampleTrans: 'Cô ấy là một doanh nhân thành công.', synonyms: ['businessman', 'founder'], hints: ['Từ tiếng Pháp: entre = giữa, prendre = nắm lấy, entrepreneur = người nắm lấy cơ hội'] },
  { word: 'profit', translation: 'lợi nhuận', pronunciation: '/ˈprɒfɪt/', example: 'The company made a big profit.', exampleTrans: 'Công ty thu được lợi nhuận lớn.', synonyms: ['gain', 'revenue'], hints: ['Profit = lợi nhuận, không phải "prophet" = nhà tiên tri'] },
  { word: 'competition', translation: 'sự cạnh tranh', pronunciation: '/ˌkɒmpɪˈtɪʃən/', example: 'Competition makes businesses better.', exampleTrans: 'Cạnh tranh giúp các doanh nghiệp tốt hơn.', synonyms: ['rivalry', 'contest'], hints: ['Compete = cạnh tranh, competition = cuộc cạnh tranh'] },
  { word: 'sustainable', translation: 'bền vững', pronunciation: '/səˈsteɪnəbl/', example: 'We need sustainable development.', exampleTrans: 'Chúng ta cần phát triển bền vững.', synonyms: ['long-term', 'eco-friendly'], hints: ['Sustain = duy trì, sustainable = có thể duy trì lâu dài'] },
  { word: 'innovation', translation: 'sự đổi mới, sáng tạo', pronunciation: '/ˌɪnəˈveɪʃən/', example: 'Innovation drives economic growth.', exampleTrans: 'Đổi mới thúc đẩy tăng trưởng kinh tế.', synonyms: ['novelty', 'creativity'], hints: ['Innovate = đổi mới, innovation = sự đổi mới'] },
  { word: 'negotiation', translation: 'đàm phán', pronunciation: '/nɪˌɡəʊʃiˈeɪʃən/', example: 'The negotiation lasted 3 hours.', exampleTrans: 'Cuộc đàm phán kéo dài 3 tiếng.', synonyms: ['bargaining', 'discussion'], hints: ['Negotiate = đàm phán, negotiation = quá trình đàm phán'] },
  { word: 'strategy', translation: 'chiến lược', pronunciation: '/ˈstrætɪdʒi/', example: 'We need a good marketing strategy.', exampleTrans: 'Chúng ta cần chiến lược marketing tốt.', synonyms: ['plan', 'approach'], hints: ['Strategos = tướng quân (Hy Lạp), strategy = kế hoạch của tướng quân'] },
];

const B1_COMMUNICATION: LangWordItem[] = [
  { word: 'communicate', translation: 'giao tiếp', pronunciation: '/kəˈmjuːnɪkeɪt/', example: 'We communicate through language.', exampleTrans: 'Chúng ta giao tiếp qua ngôn ngữ.', synonyms: ['convey', 'express', 'interact'], hints: ['Common = chung, communicate = chia sẻ điều chung'] },
  { word: 'fluent', translation: 'lưu loát', pronunciation: '/ˈfluːənt/', example: 'She speaks English fluently.', exampleTrans: 'Cô ấy nói tiếng Anh lưu loát.', synonyms: ['proficient', 'skilled'], hints: ['Fluid = chảy, fluent = nói chảy như nước'] },
  { word: 'accent', translation: 'giọng, trọng âm', pronunciation: '/ˈæksənt/', example: 'She has a French accent.', exampleTrans: 'Cô ấy có giọng Pháp.', synonyms: ['pronunciation', 'dialect'], hints: ['Accent = giọng điệu, ak-sent'] },
  { word: 'vocabulary', translation: 'từ vựng', pronunciation: '/vəˈkæbjʊləri/', example: 'Reading expands your vocabulary.', exampleTrans: 'Đọc sách mở rộng vốn từ vựng của bạn.', synonyms: ['words', 'lexicon'], hints: ['Vocal = giọng nói, vocabulary = kho từ dùng để nói'] },
  { word: 'grammar', translation: 'ngữ pháp', pronunciation: '/ˈɡræmər/', example: 'Good grammar is important in writing.', exampleTrans: 'Ngữ pháp tốt rất quan trọng trong viết.', synonyms: ['syntax', 'rules'], hints: ['Grammar = ngữ pháp, gram-mờ'] },
  { word: 'bilingual', translation: 'song ngữ', pronunciation: '/baɪˈlɪŋɡwəl/', example: 'She is bilingual in French and English.', exampleTrans: 'Cô ấy thông thạo cả tiếng Pháp và tiếng Anh.', synonyms: ['multilingual', 'two-language'], hints: ['Bi = hai, lingual = ngôn ngữ, bilingual = biết hai ngôn ngữ'] },
  { word: 'translate', translation: 'dịch, phiên dịch', pronunciation: '/trænsˈleɪt/', example: 'Can you translate this sentence?', exampleTrans: 'Bạn có thể dịch câu này không?', synonyms: ['interpret', 'convert'], hints: ['Trans = qua, late = mang, translate = mang ý nghĩa qua ngôn ngữ khác'] },
  { word: 'misunderstand', translation: 'hiểu nhầm', pronunciation: '/ˌmɪsʌndərˈstænd/', example: 'I misunderstood the question.', exampleTrans: 'Tôi đã hiểu nhầm câu hỏi.', synonyms: ['confuse', 'mistake'], hints: ['Mis = sai, understand = hiểu, misunderstand = hiểu sai'] },
];

// ─── A1 — Nhà cửa & Quần áo & Địa điểm ──────────────────────────────────────

const A1_HOME: LangWordItem[] = [
  { word: 'room', translation: 'phòng', pronunciation: '/ruːm/', example: 'My room is clean.', exampleTrans: 'Phòng tôi sạch sẽ.', synonyms: ['chamber', 'space'], hints: ['Room = phòng, đọc "rum"', 'Bé có một căn room để học bài'] },
  { word: 'kitchen', translation: 'nhà bếp', pronunciation: '/ˈkɪtʃɪn/', example: 'Mother cooks in the kitchen.', exampleTrans: 'Mẹ nấu ăn trong nhà bếp.', synonyms: ['cookroom'], hints: ['Kitchen = bếp, kit-chần', 'Nơi cook (nấu ăn) diễn ra'] },
  { word: 'bedroom', translation: 'phòng ngủ', pronunciation: '/ˈbedrʊm/', example: 'I sleep in my bedroom.', exampleTrans: 'Tôi ngủ trong phòng ngủ của mình.', synonyms: ['sleeping room'], hints: ['Bed = giường, bedroom = phòng có giường', 'Bed + room = phòng ngủ'] },
  { word: 'bathroom', translation: 'phòng tắm', pronunciation: '/ˈbɑːθruːm/', example: 'Wash your hands in the bathroom.', exampleTrans: 'Rửa tay trong phòng tắm.', synonyms: ['washroom', 'restroom'], hints: ['Bath = tắm, bathroom = phòng tắm', 'Đọc "bath-rum"'] },
  { word: 'garden', translation: 'khu vườn', pronunciation: '/ˈɡɑːrdən/', example: 'We grow flowers in the garden.', exampleTrans: 'Chúng tôi trồng hoa trong vườn.', synonyms: ['yard', 'backyard'], hints: ['Garden = vườn, gar-đần', 'Hình ảnh khu vườn xanh tươi'] },
  { word: 'sofa', translation: 'ghế sofa', pronunciation: '/ˈsəʊfə/', example: 'We sit on the sofa to watch TV.', exampleTrans: 'Chúng tôi ngồi sofa để xem TV.', synonyms: ['couch', 'settee'], hints: ['Sofa = ghế sofa, dùng từ gốc Ả Rập', 'Đọc "sô-phờ"'] },
  { word: 'lamp', translation: 'đèn (bàn/đứng)', pronunciation: '/læmp/', example: 'Turn on the lamp to read.', exampleTrans: 'Bật đèn lên để đọc sách.', synonyms: ['light', 'lantern'], hints: ['Lamp = đèn, đọc "lamp"', 'Hình ảnh Aladdin và cây đèn thần'] },
  { word: 'shelf', translation: 'kệ sách, giá đỡ', pronunciation: '/ʃelf/', example: 'Books are on the shelf.', exampleTrans: 'Sách ở trên kệ.', synonyms: ['rack', 'bookshelf'], hints: ['Shelf = kệ, đọc "shelf"', 'Số nhiều là shelves'] },
  { word: 'mirror', translation: 'gương', pronunciation: '/ˈmɪrər/', example: 'She looks in the mirror.', exampleTrans: 'Cô ấy nhìn vào gương.', synonyms: ['glass', 'looking glass'], hints: ['Mirror = gương, mir-ờ', 'Mirror image = ảnh gương'] },
  { word: 'stairs', translation: 'cầu thang', pronunciation: '/steərz/', example: 'Walk up the stairs slowly.', exampleTrans: 'Đi lên cầu thang từ từ.', synonyms: ['steps', 'staircase'], hints: ['Stairs = cầu thang, đọc "steaz"', 'Hình ảnh bậc thang bước lên'] },
  { word: 'floor', translation: 'sàn nhà, tầng', pronunciation: '/flɔːr/', example: 'The floor is clean.', exampleTrans: 'Sàn nhà sạch sẽ.', synonyms: ['ground', 'level'], hints: ['Floor = sàn nhà / tầng lầu, đọc "flo-ờ"', 'Floor 1 = tầng 1'] },
  { word: 'wall', translation: 'tường', pronunciation: '/wɔːl/', example: 'There are pictures on the wall.', exampleTrans: 'Có tranh treo trên tường.', synonyms: ['partition'], hints: ['Wall = tường, đọc "wol"', 'Great Wall = Vạn Lý Trường Thành'] },
  { word: 'roof', translation: 'mái nhà', pronunciation: '/ruːf/', example: 'The roof keeps us dry.', exampleTrans: 'Mái nhà che chúng ta khỏi mưa.', synonyms: ['ceiling', 'top'], hints: ['Roof = mái nhà, đọc "ruf"', 'Roof garden = vườn trên sân thượng'] },
  { word: 'gate', translation: 'cổng', pronunciation: '/ɡeɪt/', example: 'Please close the gate.', exampleTrans: 'Vui lòng đóng cổng lại.', synonyms: ['entrance', 'door'], hints: ['Gate = cổng vào, đọc "gây-t"', 'Airport gate = cổng lên máy bay'] },
  { word: 'balcony', translation: 'ban công', pronunciation: '/ˈbælkəni/', example: 'She drinks tea on the balcony.', exampleTrans: 'Cô ấy uống trà trên ban công.', synonyms: ['terrace', 'porch'], hints: ['Balcony = ban công, bal-kờ-ni', 'Nhìn từ balcony xuống đường phố'] },
];

const A1_CLOTHES: LangWordItem[] = [
  { word: 'shirt', translation: 'áo sơ mi', pronunciation: '/ʃɜːrt/', example: 'He wears a white shirt.', exampleTrans: 'Anh ấy mặc áo sơ mi trắng.', synonyms: ['blouse', 'top'], hints: ['Shirt = áo sơ mi, đọc "shơ-t"', 'T-shirt = áo phông'] },
  { word: 'trousers', translation: 'quần dài', pronunciation: '/ˈtraʊzərz/', example: 'He puts on his trousers.', exampleTrans: 'Anh ấy mặc quần dài vào.', synonyms: ['pants', 'slacks'], hints: ['Trousers = quần dài, trao-zờz', 'Pants (Mỹ) = trousers (Anh)'] },
  { word: 'dress', translation: 'váy đầm', pronunciation: '/dres/', example: 'She wears a beautiful dress.', exampleTrans: 'Cô ấy mặc chiếc váy đẹp.', synonyms: ['gown', 'skirt'], hints: ['Dress = váy đầm, đọc "đres"', 'Dress up = mặc đẹp'] },
  { word: 'shoes', translation: 'đôi giày', pronunciation: '/ʃuːz/', example: 'Put on your shoes before going out.', exampleTrans: 'Đi giày vào trước khi ra ngoài.', synonyms: ['footwear', 'boots'], hints: ['Shoes = giày, đọc "shuz"', 'Số ít: a shoe (một chiếc giày)'] },
  { word: 'hat', translation: 'mũ, nón', pronunciation: '/hæt/', example: 'Wear a hat in the sun.', exampleTrans: 'Đội mũ khi ra nắng.', synonyms: ['cap', 'headwear'], hints: ['Hat = mũ, đọc "het"', 'Cap thường không có vành, hat có vành'] },
  { word: 'coat', translation: 'áo khoác dày', pronunciation: '/kəʊt/', example: 'She wears a coat in winter.', exampleTrans: 'Cô ấy mặc áo khoác dày vào mùa đông.', synonyms: ['jacket', 'overcoat'], hints: ['Coat = áo khoác dày, đọc "côt"', 'Coat là loại áo dày hơn jacket'] },
  { word: 'socks', translation: 'tất, vớ', pronunciation: '/sɒks/', example: 'She wears warm socks.', exampleTrans: 'Cô ấy mang tất ấm.', synonyms: ['stockings', 'hosiery'], hints: ['Socks = tất, đọc "soks"', 'Sock = 1 chiếc tất, socks = 2 chiếc'] },
  { word: 'jacket', translation: 'áo khoác', pronunciation: '/ˈdʒækɪt/', example: 'He puts on a jacket.', exampleTrans: 'Anh ấy mặc áo khoác.', synonyms: ['coat', 'blazer'], hints: ['Jacket = áo khoác, jak-ịt', 'Nhẹ hơn coat, thường mặc trong nhà'] },
  { word: 'skirt', translation: 'chân váy', pronunciation: '/skɜːrt/', example: 'She wears a pink skirt.', exampleTrans: 'Cô ấy mặc chân váy màu hồng.', synonyms: ['miniskirt'], hints: ['Skirt = chân váy, đọc "skơ-t"', 'Khác với dress là chỉ phần dưới'] },
  { word: 'belt', translation: 'thắt lưng', pronunciation: '/belt/', example: 'He wears a leather belt.', exampleTrans: 'Anh ấy đeo thắt lưng da.', synonyms: ['strap', 'girdle'], hints: ['Belt = thắt lưng, đọc "belt"', 'Seat belt = dây an toàn'] },
  { word: 'scarf', translation: 'khăn quàng cổ', pronunciation: '/skɑːrf/', example: 'She wraps a scarf around her neck.', exampleTrans: 'Cô ấy quàng khăn quanh cổ.', synonyms: ['wrap', 'shawl'], hints: ['Scarf = khăn quàng, đọc "skarf"', 'Dùng khi trời lạnh'] },
  { word: 'umbrella', translation: 'ô, dù', pronunciation: '/ʌmˈbrelə/', example: 'Take an umbrella when it rains.', exampleTrans: 'Mang ô khi trời mưa.', synonyms: ['parasol', 'brolly'], hints: ['Umbrella = ô/dù, âm-brel-ờ', 'Umbra trong Latin = bóng tối'] },
  { word: 'jeans', translation: 'quần jeans', pronunciation: '/dʒiːnz/', example: 'I love wearing blue jeans.', exampleTrans: 'Tôi thích mặc quần jeans xanh.', synonyms: ['denim', 'blue jeans'], hints: ['Jeans = quần bò/jeans, đọc "jinz"', 'Từ thành phố Genoa (Ý)'] },
  { word: 'boots', translation: 'giày boot, ủng', pronunciation: '/buːts/', example: 'She wears boots in winter.', exampleTrans: 'Cô ấy đi giày boot vào mùa đông.', synonyms: ['high boots', 'ankle boots'], hints: ['Boots = giày cao cổ, đọc "buts"', 'Boot = 1 chiếc, boots = 2 chiếc'] },
  { word: 'gloves', translation: 'găng tay', pronunciation: '/ɡlʌvz/', example: 'Wear gloves to keep your hands warm.', exampleTrans: 'Đeo găng tay để giữ tay ấm.', synonyms: ['mittens', 'handwear'], hints: ['Gloves = găng tay, đọc "glovz"', 'Boxing gloves = găng đấm bốc'] },
];

const A1_PLACES: LangWordItem[] = [
  { word: 'park', translation: 'công viên', pronunciation: '/pɑːrk/', example: 'Children play in the park.', exampleTrans: 'Trẻ em chơi trong công viên.', synonyms: ['garden', 'playground'], hints: ['Park = công viên, đọc "pak"', 'Park cũng có nghĩa là đỗ xe'] },
  { word: 'market', translation: 'chợ, siêu thị', pronunciation: '/ˈmɑːrkɪt/', example: 'We buy vegetables at the market.', exampleTrans: 'Chúng tôi mua rau ở chợ.', synonyms: ['bazaar', 'store'], hints: ['Market = chợ, đọc "mar-kịt"', 'Supermarket = siêu thị'] },
  { word: 'restaurant', translation: 'nhà hàng', pronunciation: '/ˈrestrɒnt/', example: 'We had dinner at a restaurant.', exampleTrans: 'Chúng tôi ăn tối ở nhà hàng.', synonyms: ['diner', 'eatery'], hints: ['Restaurant = nhà hàng, res-tờ-rant', 'Từ tiếng Pháp: "restaurer" = phục hồi'] },
  { word: 'hotel', translation: 'khách sạn', pronunciation: '/həʊˈtel/', example: 'We stayed at a nice hotel.', exampleTrans: 'Chúng tôi ở một khách sạn đẹp.', synonyms: ['inn', 'motel'], hints: ['Hotel = khách sạn, hô-tel', '5-star hotel = khách sạn 5 sao'] },
  { word: 'bank', translation: 'ngân hàng', pronunciation: '/bæŋk/', example: 'I need to go to the bank.', exampleTrans: 'Tôi cần đến ngân hàng.', synonyms: ['financial institution'], hints: ['Bank = ngân hàng, đọc "bank"', 'River bank = bờ sông (nghĩa khác)'] },
  { word: 'cinema', translation: 'rạp chiếu phim', pronunciation: '/ˈsɪnɪmə/', example: 'Let\'s go to the cinema tonight.', exampleTrans: 'Hãy đi rạp tối nay.', synonyms: ['movie theater', 'film theater'], hints: ['Cinema = rạp phim, sin-ờ-mờ', 'Movie theater (Mỹ) = cinema (Anh)'] },
  { word: 'museum', translation: 'bảo tàng', pronunciation: '/mjuːˈziːəm/', example: 'The museum has old paintings.', exampleTrans: 'Bảo tàng có những bức tranh cổ.', synonyms: ['gallery', 'exhibition hall'], hints: ['Museum = bảo tàng, miu-zi-ờm', 'Muse = thần cảm hứng Hy Lạp'] },
  { word: 'beach', translation: 'bãi biển', pronunciation: '/biːtʃ/', example: 'We swim at the beach.', exampleTrans: 'Chúng tôi bơi ở bãi biển.', synonyms: ['shore', 'coast'], hints: ['Beach = bãi biển, đọc "bich"', 'Sandy beach = bãi biển cát'] },
  { word: 'farm', translation: 'trang trại', pronunciation: '/fɑːrm/', example: 'The farmer works on the farm.', exampleTrans: 'Nông dân làm việc trên trang trại.', synonyms: ['ranch', 'plantation'], hints: ['Farm = trang trại, đọc "farm"', 'Farmhouse = ngôi nhà trên trang trại'] },
  { word: 'zoo', translation: 'vườn thú', pronunciation: '/zuː/', example: 'We see many animals at the zoo.', exampleTrans: 'Chúng tôi nhìn thấy nhiều con vật ở vườn thú.', synonyms: ['wildlife park', 'animal park'], hints: ['Zoo = vườn thú, đọc "zu"', 'Từ viết tắt của "zoological garden"'] },
  { word: 'temple', translation: 'đền, chùa', pronunciation: '/ˈtempl/', example: 'People pray at the temple.', exampleTrans: 'Người ta cầu nguyện ở đền.', synonyms: ['shrine', 'pagoda'], hints: ['Temple = đền thờ, đọc "tem-pồ"', 'Temple cũng là thái dương (phần đầu)'] },
  { word: 'stadium', translation: 'sân vận động', pronunciation: '/ˈsteɪdiəm/', example: 'Fans cheer at the stadium.', exampleTrans: 'Người hâm mộ cổ vũ ở sân vận động.', synonyms: ['arena', 'ground'], hints: ['Stadium = sân vận động, stây-đi-ờm', 'Từ Hy Lạp: stade = đơn vị đo chiều dài'] },
  { word: 'bridge', translation: 'cây cầu', pronunciation: '/brɪdʒ/', example: 'We cross the bridge over the river.', exampleTrans: 'Chúng tôi qua cầu bắc qua sông.', synonyms: ['overpass', 'viaduct'], hints: ['Bridge = cầu, đọc "brijh"', 'Bridge cũng là game bài (bridge)'] },
  { word: 'street', translation: 'đường phố', pronunciation: '/striːt/', example: 'There are many shops on this street.', exampleTrans: 'Có nhiều cửa hàng trên đường phố này.', synonyms: ['road', 'avenue'], hints: ['Street = đường phố, đọc "strit"', 'Street food = đồ ăn đường phố'] },
  { word: 'church', translation: 'nhà thờ', pronunciation: '/tʃɜːrtʃ/', example: 'They go to church on Sunday.', exampleTrans: 'Họ đi nhà thờ vào Chủ nhật.', synonyms: ['chapel', 'cathedral'], hints: ['Church = nhà thờ, đọc "chơ-ch"', 'Cathedral là nhà thờ lớn hơn'] },
];

const A1_SPORTS: LangWordItem[] = [
  { word: 'football', translation: 'bóng đá', pronunciation: '/ˈfʊtbɔːl/', example: 'He plays football every weekend.', exampleTrans: 'Anh ấy chơi bóng đá mỗi cuối tuần.', synonyms: ['soccer', 'ball game'], hints: ['Football = bóng đá (Anh), soccer (Mỹ)', 'Foot + ball = bóng chân'] },
  { word: 'basketball', translation: 'bóng rổ', pronunciation: '/ˈbɑːskɪtbɔːl/', example: 'She plays basketball at school.', exampleTrans: 'Cô ấy chơi bóng rổ ở trường.', synonyms: ['ball sport'], hints: ['Basketball = bóng rổ, bas-kit-bol', 'Basket = rổ, ball = bóng'] },
  { word: 'swimming', translation: 'bơi lội', pronunciation: '/ˈswɪmɪŋ/', example: 'Swimming is good for health.', exampleTrans: 'Bơi lội rất tốt cho sức khỏe.', synonyms: ['water sport', 'swim'], hints: ['Swimming = bơi lội, swim-ming', 'Swimming pool = bể bơi'] },
  { word: 'running', translation: 'chạy bộ', pronunciation: '/ˈrʌnɪŋ/', example: 'Running keeps you fit.', exampleTrans: 'Chạy bộ giúp bạn khỏe mạnh.', synonyms: ['jogging', 'sprint'], hints: ['Running = chạy bộ, run-ning', 'Morning run = chạy buổi sáng'] },
  { word: 'tennis', translation: 'quần vợt', pronunciation: '/ˈtenɪs/', example: 'They play tennis on the court.', exampleTrans: 'Họ chơi quần vợt trên sân.', synonyms: ['racket sport'], hints: ['Tennis = quần vợt, ten-nịs', 'Tennis court = sân quần vợt'] },
  { word: 'badminton', translation: 'cầu lông', pronunciation: '/ˈbædmɪntən/', example: 'He plays badminton with his sister.', exampleTrans: 'Anh ấy chơi cầu lông với em gái.', synonyms: ['shuttlecock sport'], hints: ['Badminton = cầu lông, bad-min-tần', 'Từ thị trấn Badminton ở Anh'] },
  { word: 'cycling', translation: 'đạp xe, đua xe đạp', pronunciation: '/ˈsaɪklɪŋ/', example: 'He enjoys cycling in the park.', exampleTrans: 'Anh ấy thích đạp xe trong công viên.', synonyms: ['biking', 'bicycle riding'], hints: ['Cycling = đạp xe, sai-kling', 'Cycle = vòng lặp, cycling = đạp xe vòng vòng'] },
  { word: 'volleyball', translation: 'bóng chuyền', pronunciation: '/ˈvɒlɪbɔːl/', example: 'We play volleyball on the beach.', exampleTrans: 'Chúng tôi chơi bóng chuyền trên bãi biển.', synonyms: ['net sport'], hints: ['Volleyball = bóng chuyền, vol-li-bol', 'Volley = đánh bóng khi chưa chạm đất'] },
  { word: 'yoga', translation: 'yoga', pronunciation: '/ˈjəʊɡə/', example: 'She does yoga every morning.', exampleTrans: 'Cô ấy tập yoga mỗi buổi sáng.', synonyms: ['meditation', 'stretching'], hints: ['Yoga = yoga, đọc "yô-gờ"', 'Từ tiếng Sanskrit: yuj = kết nối'] },
  { word: 'dance', translation: 'nhảy, khiêu vũ', pronunciation: '/dɑːns/', example: 'She likes to dance to music.', exampleTrans: 'Cô ấy thích nhảy theo nhạc.', synonyms: ['move', 'perform'], hints: ['Dance = nhảy, đọc "dans"', 'Dancer = vũ công, dancing = đang nhảy'] },
];

// ─── A2 — Du lịch & Mua sắm & Công nghệ cơ bản ───────────────────────────────

const A2_TRAVEL: LangWordItem[] = [
  { word: 'airport', translation: 'sân bay', pronunciation: '/ˈeəpɔːrt/', example: 'We arrived at the airport early.', exampleTrans: 'Chúng tôi đến sân bay sớm.', synonyms: ['terminal', 'airfield'], hints: ['Air + port = cảng hàng không', 'Đọc "e-ờ-pot"'] },
  { word: 'passport', translation: 'hộ chiếu', pronunciation: '/ˈpɑːspɔːrt/', example: 'Don\'t forget your passport.', exampleTrans: 'Đừng quên hộ chiếu nhé.', synonyms: ['travel document', 'ID'], hints: ['Pass + port = giấy qua cổng', 'Đọc "pas-pot"'] },
  { word: 'ticket', translation: 'vé', pronunciation: '/ˈtɪkɪt/', example: 'I bought a train ticket.', exampleTrans: 'Tôi mua vé tàu.', synonyms: ['pass', 'entry'], hints: ['Ticket = vé, đọc "tik-ịt"', 'Ticket office = phòng bán vé'] },
  { word: 'luggage', translation: 'hành lý', pronunciation: '/ˈlʌɡɪdʒ/', example: 'My luggage is too heavy.', exampleTrans: 'Hành lý của tôi quá nặng.', synonyms: ['baggage', 'suitcase'], hints: ['Luggage = hành lý, lâg-ij', 'Luggage claim = khu lấy hành lý'] },
  { word: 'visa', translation: 'thị thực, visa', pronunciation: '/ˈviːzə/', example: 'You need a visa to enter that country.', exampleTrans: 'Bạn cần visa để vào nước đó.', synonyms: ['entry permit'], hints: ['Visa = thị thực, vi-zờ', 'Tourist visa = visa du lịch'] },
  { word: 'flight', translation: 'chuyến bay', pronunciation: '/flaɪt/', example: 'The flight takes 2 hours.', exampleTrans: 'Chuyến bay mất 2 tiếng.', synonyms: ['airplane trip', 'journey'], hints: ['Flight = chuyến bay, đọc "flayt"', 'Fly → flight, giống run → run'] },
  { word: 'destination', translation: 'điểm đến', pronunciation: '/ˌdestɪˈneɪʃən/', example: 'Paris is our destination.', exampleTrans: 'Paris là điểm đến của chúng tôi.', synonyms: ['location', 'arrival point'], hints: ['Destine = định sẵn, destination = nơi định đến', 'Đọc "des-tờ-nây-shần"'] },
  { word: 'tourist', translation: 'du khách', pronunciation: '/ˈtʊərɪst/', example: 'Many tourists visit Vietnam.', exampleTrans: 'Nhiều du khách thăm Việt Nam.', synonyms: ['traveler', 'visitor'], hints: ['Tour = chuyến đi, tourist = người đi tour', 'Đọc "tua-rịst"'] },
  { word: 'souvenir', translation: 'quà lưu niệm', pronunciation: '/ˌsuːvəˈnɪər/', example: 'She bought souvenirs for her family.', exampleTrans: 'Cô ấy mua quà lưu niệm cho gia đình.', synonyms: ['keepsake', 'memento'], hints: ['Souvenir từ tiếng Pháp: nhớ', 'Đọc "su-vờ-nia"'] },
  { word: 'reservation', translation: 'đặt chỗ trước', pronunciation: '/ˌrezəˈveɪʃən/', example: 'I made a reservation at the hotel.', exampleTrans: 'Tôi đặt phòng ở khách sạn.', synonyms: ['booking', 'appointment'], hints: ['Reserve = giữ chỗ, reservation = việc đặt chỗ', 'Đọc "rez-ờ-vây-shần"'] },
  { word: 'customs', translation: 'hải quan', pronunciation: '/ˈkʌstəmz/', example: 'You must pass through customs.', exampleTrans: 'Bạn phải qua hải quan.', synonyms: ['immigration', 'border control'], hints: ['Custom = phong tục, customs = cơ quan kiểm soát', 'Đọc "cus-tầmz"'] },
  { word: 'currency', translation: 'tiền tệ, ngoại tệ', pronunciation: '/ˈkɜːrənsi/', example: 'Exchange currency at the bank.', exampleTrans: 'Đổi tiền tệ tại ngân hàng.', synonyms: ['money', 'cash'], hints: ['Current = hiện tại, currency = tiền đang dùng', 'Foreign currency = ngoại tệ'] },
  { word: 'journey', translation: 'chuyến hành trình', pronunciation: '/ˈdʒɜːrni/', example: 'The journey was long but fun.', exampleTrans: 'Hành trình dài nhưng vui.', synonyms: ['trip', 'travel'], hints: ['Journey = hành trình, đọc "jơ-ni"', 'Từ tiếng Pháp: journée = ngày'] },
  { word: 'guide', translation: 'hướng dẫn viên, sách hướng dẫn', pronunciation: '/ɡaɪd/', example: 'A tour guide leads the group.', exampleTrans: 'Hướng dẫn viên dẫn đầu nhóm.', synonyms: ['leader', 'handbook'], hints: ['Guide = người chỉ đường, đọc "gayd"', 'Travel guide = sách du lịch'] },
  { word: 'vacation', translation: 'kỳ nghỉ', pronunciation: '/veɪˈkeɪʃən/', example: 'We went to the beach for vacation.', exampleTrans: 'Chúng tôi đi biển vào kỳ nghỉ.', synonyms: ['holiday', 'break'], hints: ['Vacate = bỏ trống, vacation = thời gian trống để nghỉ', 'Đọc "vây-kây-shần"'] },
];

const A2_SHOPPING: LangWordItem[] = [
  { word: 'price', translation: 'giá cả', pronunciation: '/praɪs/', example: 'What is the price of this shirt?', exampleTrans: 'Giá của chiếc áo này là bao nhiêu?', synonyms: ['cost', 'charge'], hints: ['Price = giá, đọc "prais"', 'Price tag = nhãn giá'] },
  { word: 'discount', translation: 'giảm giá', pronunciation: '/ˈdɪskaʊnt/', example: 'There is a 20% discount today.', exampleTrans: 'Hôm nay có giảm giá 20%.', synonyms: ['sale', 'reduction'], hints: ['Dis + count = đếm bớt = giảm giá', 'Đọc "dis-kaunt"'] },
  { word: 'receipt', translation: 'hóa đơn, biên lai', pronunciation: '/rɪˈsiːt/', example: 'Keep your receipt for returns.', exampleTrans: 'Giữ hóa đơn để đổi hàng.', synonyms: ['invoice', 'bill'], hints: ['Receipt = biên lai, ri-sit (p không đọc)', 'Receive = nhận, receipt = giấy đã nhận'] },
  { word: 'cash', translation: 'tiền mặt', pronunciation: '/kæʃ/', example: 'Do you accept cash or card?', exampleTrans: 'Bạn nhận tiền mặt hay thẻ?', synonyms: ['money', 'currency'], hints: ['Cash = tiền mặt, đọc "kesh"', 'ATM = máy rút tiền mặt'] },
  { word: 'credit card', translation: 'thẻ tín dụng', pronunciation: '/ˈkredɪt kɑːrd/', example: 'She pays with a credit card.', exampleTrans: 'Cô ấy thanh toán bằng thẻ tín dụng.', synonyms: ['debit card', 'plastic'], hints: ['Credit = tín dụng, card = thẻ', 'Ngân hàng cho mượn trước, trả sau'] },
  { word: 'store', translation: 'cửa hàng', pronunciation: '/stɔːr/', example: 'There are many stores in the mall.', exampleTrans: 'Có nhiều cửa hàng trong trung tâm thương mại.', synonyms: ['shop', 'outlet'], hints: ['Store = cửa hàng, đọc "sto-ờ"', 'Convenience store = cửa hàng tiện lợi'] },
  { word: 'sale', translation: 'đợt giảm giá, bán hàng', pronunciation: '/seɪl/', example: 'The store has a big sale.', exampleTrans: 'Cửa hàng có đợt giảm giá lớn.', synonyms: ['discount', 'deal'], hints: ['Sale = bán hàng / giảm giá, đọc "sêyl"', 'For sale = đang bán; on sale = giảm giá'] },
  { word: 'customer', translation: 'khách hàng', pronunciation: '/ˈkʌstəmər/', example: 'The customer is always right.', exampleTrans: 'Khách hàng luôn luôn đúng.', synonyms: ['client', 'buyer'], hints: ['Custom = thói quen, customer = người hay mua', 'Customer service = dịch vụ khách hàng'] },
  { word: 'brand', translation: 'thương hiệu', pronunciation: '/brænd/', example: 'This is a famous brand.', exampleTrans: 'Đây là thương hiệu nổi tiếng.', synonyms: ['label', 'trademark'], hints: ['Brand = thương hiệu, đọc "brand"', 'Branded = hàng có thương hiệu'] },
  { word: 'refund', translation: 'hoàn tiền', pronunciation: '/ˈriːfʌnd/', example: 'Can I get a refund for this item?', exampleTrans: 'Tôi có thể hoàn tiền mặt hàng này không?', synonyms: ['reimbursement', 'return'], hints: ['Re + fund = đưa tiền lại', 'Full refund = hoàn tiền đầy đủ'] },
  { word: 'size', translation: 'kích cỡ', pronunciation: '/saɪz/', example: 'Do you have this in a bigger size?', exampleTrans: 'Bạn có cái này cỡ lớn hơn không?', synonyms: ['dimension', 'measurement'], hints: ['Size = cỡ/kích thước, đọc "sayz"', 'Small, Medium, Large = S, M, L'] },
  { word: 'exchange', translation: 'đổi hàng, trao đổi', pronunciation: '/ɪksˈtʃeɪndʒ/', example: 'Can I exchange this for a different color?', exampleTrans: 'Tôi có thể đổi cái này sang màu khác không?', synonyms: ['swap', 'trade'], hints: ['Ex + change = đổi lại', 'Exchange rate = tỷ giá hối đoái'] },
  { word: 'mall', translation: 'trung tâm thương mại', pronunciation: '/mɔːl/', example: 'We spent the day at the mall.', exampleTrans: 'Chúng tôi dành ngày ở trung tâm thương mại.', synonyms: ['shopping center', 'plaza'], hints: ['Mall = trung tâm thương mại, đọc "mol"', 'Shopping mall = nơi tập hợp nhiều cửa hàng'] },
  { word: 'bargain', translation: 'mặc cả, đồ hời', pronunciation: '/ˈbɑːrɡɪn/', example: 'I got this at a bargain price.', exampleTrans: 'Tôi mua cái này với giá hời.', synonyms: ['deal', 'discount'], hints: ['Bargain = mặc cả / giá hời, bar-gần', 'Bargain hunter = người thích mua hàng giá rẻ'] },
  { word: 'cashier', translation: 'thu ngân', pronunciation: '/kæˈʃɪər/', example: 'Pay at the cashier.', exampleTrans: 'Thanh toán ở quầy thu ngân.', synonyms: ['checkout', 'teller'], hints: ['Cash = tiền, cashier = người giữ tiền', 'Đọc "ke-shia"'] },
];

const A2_TECHNOLOGY: LangWordItem[] = [
  { word: 'phone', translation: 'điện thoại', pronunciation: '/fəʊn/', example: 'Call me on my phone.', exampleTrans: 'Gọi cho tôi qua điện thoại.', synonyms: ['mobile', 'cell phone'], hints: ['Phone = điện thoại, đọc "phôn"', 'Smartphone = điện thoại thông minh'] },
  { word: 'internet', translation: 'mạng internet', pronunciation: '/ˈɪntərnet/', example: 'I use the internet every day.', exampleTrans: 'Tôi dùng internet mỗi ngày.', synonyms: ['web', 'online network'], hints: ['Inter = giữa, net = mạng', 'WWW = World Wide Web = internet'] },
  { word: 'computer', translation: 'máy tính', pronunciation: '/kəmˈpjuːtər/', example: 'She works on a computer.', exampleTrans: 'Cô ấy làm việc trên máy tính.', synonyms: ['PC', 'laptop'], hints: ['Compute = tính toán, computer = máy tính', 'Đọc "kəm-piu-tờ"'] },
  { word: 'email', translation: 'thư điện tử, email', pronunciation: '/ˈiːmeɪl/', example: 'Send me an email.', exampleTrans: 'Gửi email cho tôi nhé.', synonyms: ['electronic mail', 'message'], hints: ['E + mail = thư điện tử', 'Inbox = hộp thư đến'] },
  { word: 'message', translation: 'tin nhắn, thông điệp', pronunciation: '/ˈmesɪdʒ/', example: 'I got your message.', exampleTrans: 'Tôi đã nhận tin nhắn của bạn.', synonyms: ['text', 'note'], hints: ['Message = tin nhắn, mes-ij', 'Messenger = người/ứng dụng nhắn tin'] },
  { word: 'website', translation: 'trang web', pronunciation: '/ˈwebsaɪt/', example: 'Visit our website for more info.', exampleTrans: 'Truy cập trang web của chúng tôi để biết thêm.', synonyms: ['webpage', 'site'], hints: ['Web + site = trang web', 'Homepage = trang chủ'] },
  { word: 'app', translation: 'ứng dụng (điện thoại)', pronunciation: '/æp/', example: 'This is a useful app.', exampleTrans: 'Đây là ứng dụng hữu ích.', synonyms: ['application', 'program'], hints: ['App = ứng dụng, viết tắt của application', 'Đọc "ep"'] },
  { word: 'password', translation: 'mật khẩu', pronunciation: '/ˈpɑːswɜːrd/', example: 'Don\'t share your password.', exampleTrans: 'Đừng chia sẻ mật khẩu của bạn.', synonyms: ['PIN', 'secret code'], hints: ['Pass + word = từ để qua', 'Đọc "pas-wơd"'] },
  { word: 'camera', translation: 'máy ảnh', pronunciation: '/ˈkæmərə/', example: 'Take a photo with the camera.', exampleTrans: 'Chụp ảnh bằng máy ảnh.', synonyms: ['digital camera', 'lens'], hints: ['Camera = máy ảnh, kam-ờ-rờ', 'Camera obscura = phòng tối trong Latin'] },
  { word: 'battery', translation: 'pin', pronunciation: '/ˈbætəri/', example: 'The battery is low.', exampleTrans: 'Pin đang yếu.', synonyms: ['cell', 'power source'], hints: ['Battery = pin, bet-ờ-ri', 'Low battery = pin yếu; charge the battery = sạc pin'] },
  { word: 'keyboard', translation: 'bàn phím', pronunciation: '/ˈkiːbɔːrd/', example: 'Type on the keyboard.', exampleTrans: 'Gõ phím vào bàn phím.', synonyms: ['input device', 'keys'], hints: ['Key + board = bảng phím', 'Wireless keyboard = bàn phím không dây'] },
  { word: 'screen', translation: 'màn hình', pronunciation: '/skriːn/', example: 'The screen is very bright.', exampleTrans: 'Màn hình rất sáng.', synonyms: ['display', 'monitor'], hints: ['Screen = màn hình, đọc "skrin"', 'Touchscreen = màn hình cảm ứng'] },
  { word: 'upload', translation: 'tải lên', pronunciation: '/ˈʌpləʊd/', example: 'Upload the photo to the website.', exampleTrans: 'Tải ảnh lên trang web.', synonyms: ['post', 'share'], hints: ['Up + load = đưa lên mạng', 'Đối nghĩa: download = tải xuống'] },
  { word: 'download', translation: 'tải xuống', pronunciation: '/ˈdaʊnləʊd/', example: 'Download the app for free.', exampleTrans: 'Tải ứng dụng miễn phí.', synonyms: ['install', 'save'], hints: ['Down + load = kéo xuống máy', 'Download speed = tốc độ tải'] },
  { word: 'social media', translation: 'mạng xã hội', pronunciation: '/ˈsəʊʃəl ˈmiːdiə/', example: 'She is popular on social media.', exampleTrans: 'Cô ấy nổi tiếng trên mạng xã hội.', synonyms: ['online platform', 'social network'], hints: ['Social = xã hội, media = phương tiện', 'Facebook, TikTok là social media'] },
];

const A2_FOOD2: LangWordItem[] = [
  { word: 'vegetable', translation: 'rau, rau củ', pronunciation: '/ˈvedʒtəbl/', example: 'Eat more vegetables for good health.', exampleTrans: 'Ăn nhiều rau để tốt cho sức khỏe.', synonyms: ['greens', 'produce'], hints: ['Vegetable = rau, vedj-tờ-bồ', 'Vegetarian = người ăn chay'] },
  { word: 'fruit', translation: 'trái cây', pronunciation: '/fruːt/', example: 'I eat fresh fruit every day.', exampleTrans: 'Tôi ăn trái cây tươi mỗi ngày.', synonyms: ['produce', 'berry'], hints: ['Fruit = trái cây, đọc "frut"', 'Fruit juice = nước ép trái cây'] },
  { word: 'sugar', translation: 'đường', pronunciation: '/ˈʃʊɡər/', example: 'Don\'t put too much sugar in tea.', exampleTrans: 'Đừng cho quá nhiều đường vào trà.', synonyms: ['sweetener', 'glucose'], hints: ['Sugar = đường, đọc "shu-gờ"', 'Sugar cane = mía'] },
  { word: 'salt', translation: 'muối', pronunciation: '/sɔːlt/', example: 'Add a pinch of salt to the soup.', exampleTrans: 'Thêm một chút muối vào súp.', synonyms: ['seasoning', 'sodium'], hints: ['Salt = muối, đọc "solt"', 'Salty = mặn; salt and pepper = muối và tiêu'] },
  { word: 'coffee', translation: 'cà phê', pronunciation: '/ˈkɒfi/', example: 'She drinks coffee every morning.', exampleTrans: 'Cô ấy uống cà phê mỗi buổi sáng.', synonyms: ['espresso', 'java'], hints: ['Coffee = cà phê, kof-i', 'Từ tiếng Ả Rập: qahwa'] },
  { word: 'tea', translation: 'trà', pronunciation: '/tiː/', example: 'He makes a cup of tea.', exampleTrans: 'Anh ấy pha một tách trà.', synonyms: ['herbal tea', 'green tea'], hints: ['Tea = trà, đọc "ti"', 'Teacup = tách trà, teapot = ấm trà'] },
  { word: 'soup', translation: 'súp, canh', pronunciation: '/suːp/', example: 'This soup is very delicious.', exampleTrans: 'Bát súp này rất ngon.', synonyms: ['broth', 'stew'], hints: ['Soup = súp, đọc "sup"', 'Alphabet soup = súp hình chữ cái'] },
  { word: 'noodles', translation: 'mì, bún', pronunciation: '/ˈnuːdlz/', example: 'I love Vietnamese noodle soup.', exampleTrans: 'Tôi yêu thích phở Việt Nam.', synonyms: ['pasta', 'ramen'], hints: ['Noodles = mì, đọc "nu-dolz"', 'Noodle dish = món mì'] },
  { word: 'chicken', translation: 'thịt gà', pronunciation: '/ˈtʃɪkɪn/', example: 'Fried chicken is my favorite.', exampleTrans: 'Gà rán là món yêu thích của tôi.', synonyms: ['poultry', 'hen meat'], hints: ['Chicken = thịt gà (thức ăn) hoặc con gà', 'Grilled chicken = gà nướng'] },
  { word: 'beef', translation: 'thịt bò', pronunciation: '/biːf/', example: 'The beef steak is delicious.', exampleTrans: 'Bít tết bò thật ngon.', synonyms: ['steak', 'veal'], hints: ['Beef = thịt bò, đọc "bif"', 'Beef steak = bít tết; beef soup = phở bò'] },
  { word: 'pork', translation: 'thịt lợn', pronunciation: '/pɔːrk/', example: 'Pork is used in many dishes.', exampleTrans: 'Thịt lợn được dùng trong nhiều món.', synonyms: ['pig meat', 'swine'], hints: ['Pork = thịt lợn, đọc "pok"', 'Pork chop = sườn lợn'] },
  { word: 'rice', translation: 'cơm, gạo', pronunciation: '/raɪs/', example: 'We eat rice twice a day.', exampleTrans: 'Chúng tôi ăn cơm hai lần mỗi ngày.', synonyms: ['grain', 'staple food'], hints: ['Rice = gạo/cơm, đọc "rais"', 'Steamed rice = cơm trắng'] },
  { word: 'butter', translation: 'bơ', pronunciation: '/ˈbʌtər/', example: 'Spread butter on the bread.', exampleTrans: 'Phết bơ lên bánh mì.', synonyms: ['margarine', 'spread'], hints: ['Butter = bơ, đọc "bât-ờ"', 'Peanut butter = bơ đậu phộng'] },
  { word: 'cheese', translation: 'phô mai', pronunciation: '/tʃiːz/', example: 'She puts cheese on the pizza.', exampleTrans: 'Cô ấy cho phô mai lên pizza.', synonyms: ['dairy product'], hints: ['Cheese = phô mai, đọc "chiz"', 'Cheesy = có nhiều phô mai, hoặc hài hước sến sẩm'] },
  { word: 'salad', translation: 'món rau trộn', pronunciation: '/ˈsæləd/', example: 'A fresh salad is healthy.', exampleTrans: 'Món rau trộn tươi rất tốt cho sức khỏe.', synonyms: ['greens', 'mixed vegetables'], hints: ['Salad = rau trộn, đọc "sel-əd"', 'Caesar salad = món rau trộn nổi tiếng'] },
];

// ─── B2 — Học thuật & Công việc & Môi trường ─────────────────────────────────

const B2_ACADEMIC: LangWordItem[] = [
  { word: 'analyze', translation: 'phân tích', pronunciation: '/ˈænəlaɪz/', example: 'Analyze the data carefully.', exampleTrans: 'Phân tích dữ liệu cẩn thận.', synonyms: ['examine', 'investigate'], hints: ['Analysis = sự phân tích, analyze = hành động phân tích', 'Đọc "en-ờ-layz"'] },
  { word: 'evaluate', translation: 'đánh giá', pronunciation: '/ɪˈvæljueɪt/', example: 'Evaluate the results of the study.', exampleTrans: 'Đánh giá kết quả nghiên cứu.', synonyms: ['assess', 'review'], hints: ['Value = giá trị, evaluate = định giá trị', 'Đọc "i-vel-yú-eyt"'] },
  { word: 'demonstrate', translation: 'chứng minh, trình bày', pronunciation: '/ˈdemənstreɪt/', example: 'She demonstrated the experiment.', exampleTrans: 'Cô ấy trình bày thí nghiệm.', synonyms: ['show', 'prove', 'illustrate'], hints: ['Demon = hiển nhiên, demonstrate = làm rõ', 'Demo = bản trình bày ngắn'] },
  { word: 'identify', translation: 'xác định, nhận ra', pronunciation: '/aɪˈdentɪfaɪ/', example: 'Can you identify the problem?', exampleTrans: 'Bạn có thể xác định vấn đề không?', synonyms: ['recognize', 'determine'], hints: ['Identity = danh tính, identify = xác định danh tính', 'Đọc "ai-den-tờ-fay"'] },
  { word: 'interpret', translation: 'giải thích, diễn giải', pronunciation: '/ɪnˈtɜːrprɪt/', example: 'How do you interpret this result?', exampleTrans: 'Bạn diễn giải kết quả này như thế nào?', synonyms: ['explain', 'translate'], hints: ['Inter = giữa, pret = nắm lấy', 'Interpreter = thông dịch viên'] },
  { word: 'justify', translation: 'biện minh, giải thích lý do', pronunciation: '/ˈdʒʌstɪfaɪ/', example: 'Justify your answer with examples.', exampleTrans: 'Biện minh cho câu trả lời bằng ví dụ.', synonyms: ['explain', 'defend'], hints: ['Just = công bằng, justify = làm cho công bằng bằng lý lẽ', 'Đọc "jus-tờ-fay"'] },
  { word: 'maintain', translation: 'duy trì, bảo trì', pronunciation: '/meɪnˈteɪn/', example: 'Maintain a healthy lifestyle.', exampleTrans: 'Duy trì lối sống lành mạnh.', synonyms: ['keep', 'sustain', 'preserve'], hints: ['Main = chính, tain = giữ', 'Maintenance = sự bảo trì'] },
  { word: 'obtain', translation: 'đạt được, thu được', pronunciation: '/əbˈteɪn/', example: 'She obtained a scholarship.', exampleTrans: 'Cô ấy đạt được học bổng.', synonyms: ['acquire', 'achieve', 'get'], hints: ['Ob + tain = lấy đi, đọc "ờb-teyn"', 'Obtain permission = xin phép'] },
  { word: 'significant', translation: 'đáng kể, quan trọng', pronunciation: '/sɪɡˈnɪfɪkənt/', example: 'There is a significant improvement.', exampleTrans: 'Có sự cải thiện đáng kể.', synonyms: ['important', 'notable', 'major'], hints: ['Sign = dấu hiệu, significant = có dấu hiệu rõ ràng', 'Đọc "sig-nif-i-kənt"'] },
  { word: 'conclude', translation: 'kết luận', pronunciation: '/kənˈkluːd/', example: 'We conclude that the study was successful.', exampleTrans: 'Chúng tôi kết luận rằng nghiên cứu thành công.', synonyms: ['determine', 'infer', 'summarize'], hints: ['Con + clude = đóng lại, kết thúc', 'Conclusion = kết luận (danh từ)'] },
  { word: 'framework', translation: 'khung, cơ cấu', pronunciation: '/ˈfreɪmwɜːrk/', example: 'Use a clear framework for your essay.', exampleTrans: 'Dùng cấu trúc rõ ràng cho bài luận của bạn.', synonyms: ['structure', 'system', 'outline'], hints: ['Frame = khung, work = công việc', 'Conceptual framework = khung khái niệm'] },
  { word: 'evidence', translation: 'bằng chứng', pronunciation: '/ˈevɪdəns/', example: 'Provide evidence to support your claim.', exampleTrans: 'Cung cấp bằng chứng để hỗ trợ lập luận của bạn.', synonyms: ['proof', 'data', 'support'], hints: ['Evident = rõ ràng, evidence = những điều rõ ràng', 'Đọc "ev-ờ-dənts"'] },
  { word: 'perspective', translation: 'góc nhìn, quan điểm', pronunciation: '/pərˈspektɪv/', example: 'Consider the issue from a new perspective.', exampleTrans: 'Xem xét vấn đề từ góc nhìn mới.', synonyms: ['viewpoint', 'angle', 'standpoint'], hints: ['Per + spect = nhìn xuyên qua', 'Point of view = perspective'] },
  { word: 'approach', translation: 'phương pháp, cách tiếp cận', pronunciation: '/əˈprəʊtʃ/', example: 'Use a different approach to solve the problem.', exampleTrans: 'Dùng cách tiếp cận khác để giải quyết vấn đề.', synonyms: ['method', 'strategy', 'technique'], hints: ['Approach = tiếp cận, ờp-rôch', 'A new approach = phương pháp mới'] },
  { word: 'implicit', translation: 'ngầm hiểu, ẩn ý', pronunciation: '/ɪmˈplɪsɪt/', example: 'There is an implicit meaning in his words.', exampleTrans: 'Có ý nghĩa ẩn trong lời nói của anh ấy.', synonyms: ['implied', 'tacit', 'unspoken'], hints: ['Im + plicare = gấp vào trong = ẩn đi', 'Đối nghĩa: explicit = rõ ràng, tường minh'] },
];

const B2_PROFESSIONAL: LangWordItem[] = [
  { word: 'career', translation: 'sự nghiệp, nghề nghiệp', pronunciation: '/kəˈrɪər/', example: 'She built a successful career.', exampleTrans: 'Cô ấy xây dựng được sự nghiệp thành công.', synonyms: ['profession', 'vocation', 'occupation'], hints: ['Career = sự nghiệp lâu dài, kờ-ria', 'Career path = con đường sự nghiệp'] },
  { word: 'colleague', translation: 'đồng nghiệp', pronunciation: '/ˈkɒliːɡ/', example: 'My colleague helped me with the report.', exampleTrans: 'Đồng nghiệp của tôi giúp tôi làm báo cáo.', synonyms: ['coworker', 'associate', 'teammate'], hints: ['Col = cùng, league = nhóm = cùng một nhóm', 'Đọc "kol-ig"'] },
  { word: 'deadline', translation: 'hạn chót, thời hạn', pronunciation: '/ˈdedlaɪn/', example: 'Submit the report before the deadline.', exampleTrans: 'Nộp báo cáo trước hạn chót.', synonyms: ['due date', 'cutoff'], hints: ['Dead = chết, line = đường giới hạn', 'Miss a deadline = trễ hạn'] },
  { word: 'budget', translation: 'ngân sách', pronunciation: '/ˈbʌdʒɪt/', example: 'The project is within budget.', exampleTrans: 'Dự án nằm trong ngân sách.', synonyms: ['allocation', 'funds'], hints: ['Budget = ngân sách, đọc "bad-jịt"', 'Budget plan = kế hoạch ngân sách'] },
  { word: 'salary', translation: 'lương tháng', pronunciation: '/ˈsæləri/', example: 'Her salary increased this year.', exampleTrans: 'Lương của cô ấy tăng năm nay.', synonyms: ['wage', 'income', 'pay'], hints: ['Từ Latin: salarium = tiền muối (trả bằng muối)', 'Monthly salary = lương tháng'] },
  { word: 'interview', translation: 'phỏng vấn', pronunciation: '/ˈɪntəvjuː/', example: 'He has a job interview tomorrow.', exampleTrans: 'Anh ấy có buổi phỏng vấn việc làm ngày mai.', synonyms: ['meeting', 'assessment'], hints: ['Inter + view = nhìn vào nhau', 'Job interview = phỏng vấn xin việc'] },
  { word: 'promote', translation: 'thăng chức, quảng bá', pronunciation: '/prəˈməʊt/', example: 'She was promoted to manager.', exampleTrans: 'Cô ấy được thăng chức lên quản lý.', synonyms: ['advance', 'elevate', 'advertise'], hints: ['Pro = tiến lên, mote = di chuyển', 'Get promoted = được thăng chức'] },
  { word: 'resign', translation: 'từ chức, xin nghỉ việc', pronunciation: '/rɪˈzaɪn/', example: 'He decided to resign from the company.', exampleTrans: 'Anh ấy quyết định xin nghỉ việc ở công ty.', synonyms: ['quit', 'leave', 'step down'], hints: ['Re = lại, sign = ký tên', 'Letter of resignation = đơn xin nghỉ việc'] },
  { word: 'client', translation: 'khách hàng, thân chủ', pronunciation: '/ˈklaɪənt/', example: 'We need to satisfy our clients.', exampleTrans: 'Chúng ta cần làm hài lòng các khách hàng.', synonyms: ['customer', 'patron', 'account'], hints: ['Client = khách hàng (trang trọng hơn customer)', 'Clientele = tập khách hàng'] },
  { word: 'contract', translation: 'hợp đồng', pronunciation: '/ˈkɒntrækt/', example: 'Sign the contract before starting work.', exampleTrans: 'Ký hợp đồng trước khi bắt đầu làm việc.', synonyms: ['agreement', 'deal', 'agreement'], hints: ['Con + tract = kéo lại với nhau', 'Contract law = luật hợp đồng'] },
  { word: 'efficient', translation: 'hiệu quả, năng suất cao', pronunciation: '/ɪˈfɪʃənt/', example: 'She is a very efficient worker.', exampleTrans: 'Cô ấy là người làm việc rất hiệu quả.', synonyms: ['effective', 'productive', 'capable'], hints: ['Effect = kết quả, efficient = có kết quả tốt với ít tài nguyên', 'Efficiency = hiệu suất'] },
  { word: 'productive', translation: 'năng suất, hiệu quả', pronunciation: '/prəˈdʌktɪv/', example: 'Today was a very productive day.', exampleTrans: 'Hôm nay là ngày rất năng suất.', synonyms: ['efficient', 'effective', 'fruitful'], hints: ['Product = sản phẩm, productive = tạo ra nhiều sản phẩm', 'Productivity = năng suất'] },
  { word: 'collaborate', translation: 'hợp tác, cộng tác', pronunciation: '/kəˈlæbəreɪt/', example: 'We collaborate with partner companies.', exampleTrans: 'Chúng tôi hợp tác với các công ty đối tác.', synonyms: ['cooperate', 'work together', 'partner'], hints: ['Col = cùng, laborate = làm việc', 'Collaboration = sự hợp tác'] },
  { word: 'initiative', translation: 'sáng kiến, chủ động', pronunciation: '/ɪˈnɪʃətɪv/', example: 'Take initiative to solve the problem.', exampleTrans: 'Chủ động giải quyết vấn đề.', synonyms: ['drive', 'enterprise', 'proposal'], hints: ['Initiate = khởi xướng, initiative = sự chủ động', 'Take the initiative = chủ động làm'] },
  { word: 'flexible', translation: 'linh hoạt', pronunciation: '/ˈfleksɪbl/', example: 'We need to be flexible in our approach.', exampleTrans: 'Chúng ta cần linh hoạt trong cách tiếp cận.', synonyms: ['adaptable', 'versatile', 'agile'], hints: ['Flex = uốn cong, flexible = có thể uốn = linh hoạt', 'Flexible hours = giờ làm linh hoạt'] },
];

const B2_ENVIRONMENT: LangWordItem[] = [
  { word: 'carbon', translation: 'carbon, các-bon', pronunciation: '/ˈkɑːrbən/', example: 'Carbon emissions cause global warming.', exampleTrans: 'Lượng khí thải carbon gây ra hiện tượng nóng lên toàn cầu.', synonyms: ['carbon dioxide', 'CO2'], hints: ['Carbon = nguyên tố C trong bảng tuần hoàn', 'Carbon footprint = dấu chân carbon'] },
  { word: 'greenhouse', translation: 'nhà kính, hiệu ứng nhà kính', pronunciation: '/ˈɡriːnhaʊs/', example: 'Greenhouse gases trap heat on Earth.', exampleTrans: 'Khí nhà kính giữ nhiệt trên Trái Đất.', synonyms: ['conservatory'], hints: ['Green = xanh, house = nhà', 'Greenhouse effect = hiệu ứng nhà kính'] },
  { word: 'biodiversity', translation: 'đa dạng sinh học', pronunciation: '/ˌbaɪəʊdaɪˈvɜːrsɪti/', example: 'We must protect biodiversity.', exampleTrans: 'Chúng ta phải bảo vệ đa dạng sinh học.', synonyms: ['ecological variety', 'species richness'], hints: ['Bio = sự sống, diversity = đa dạng', 'Đọc "bai-ô-dai-vơ-si-ti"'] },
  { word: 'habitat', translation: 'môi trường sống', pronunciation: '/ˈhæbɪtæt/', example: 'Forests are the habitat of many species.', exampleTrans: 'Rừng là môi trường sống của nhiều loài.', synonyms: ['environment', 'ecosystem', 'territory'], hints: ['Habit = thói quen, habitat = nơi sinh vật sống quen', 'Natural habitat = môi trường sống tự nhiên'] },
  { word: 'extinction', translation: 'tuyệt chủng', pronunciation: '/ɪkˈstɪŋkʃən/', example: 'Many species face extinction.', exampleTrans: 'Nhiều loài đang đối mặt với nguy cơ tuyệt chủng.', synonyms: ['disappearance', 'end'], hints: ['Extinct = đã tuyệt chủng, extinction = sự tuyệt chủng', 'Dinosaurs went extinct 65 million years ago'] },
  { word: 'conservation', translation: 'bảo tồn', pronunciation: '/ˌkɒnsəˈveɪʃən/', example: 'Wildlife conservation is very important.', exampleTrans: 'Bảo tồn động vật hoang dã rất quan trọng.', synonyms: ['preservation', 'protection'], hints: ['Conserve = tiết kiệm/bảo tồn, conservation = sự bảo tồn', 'Nature conservation = bảo tồn thiên nhiên'] },
  { word: 'deforestation', translation: 'phá rừng', pronunciation: '/ˌdiːˌfɒrɪˈsteɪʃən/', example: 'Deforestation destroys many habitats.', exampleTrans: 'Phá rừng phá hủy nhiều môi trường sống.', synonyms: ['logging', 'forest clearing'], hints: ['De = bỏ đi, forest = rừng, ation = hành động', 'Reforestation = trồng lại rừng'] },
  { word: 'emission', translation: 'khí thải', pronunciation: '/ɪˈmɪʃən/', example: 'Reduce carbon emissions to fight climate change.', exampleTrans: 'Giảm khí thải carbon để chống biến đổi khí hậu.', synonyms: ['discharge', 'release'], hints: ['Emit = thải ra, emission = sự thải ra', 'Zero-emission vehicle = xe không khí thải'] },
  { word: 'awareness', translation: 'nhận thức', pronunciation: '/əˈweənəs/', example: 'Raise awareness about climate change.', exampleTrans: 'Nâng cao nhận thức về biến đổi khí hậu.', synonyms: ['consciousness', 'understanding'], hints: ['Aware = nhận biết, awareness = sự nhận biết', 'Environmental awareness = ý thức bảo vệ môi trường'] },
  { word: 'impact', translation: 'tác động, ảnh hưởng', pronunciation: '/ˈɪmpækt/', example: 'Human activities have a huge impact on nature.', exampleTrans: 'Hoạt động của con người có tác động lớn đến thiên nhiên.', synonyms: ['effect', 'influence', 'consequence'], hints: ['Im + pact = đập mạnh vào', 'Environmental impact = tác động môi trường'] },
  { word: 'recycle', translation: 'tái chế', pronunciation: '/ˌriːˈsaɪkl/', example: 'Recycle paper, plastic, and glass.', exampleTrans: 'Tái chế giấy, nhựa và thủy tinh.', synonyms: ['reuse', 'repurpose'], hints: ['Re + cycle = làm lại vòng quay', 'Recycling bin = thùng rác tái chế'] },
  { word: 'fossil fuel', translation: 'nhiên liệu hóa thạch', pronunciation: '/ˈfɒsl fjuːəl/', example: 'Fossil fuels cause pollution.', exampleTrans: 'Nhiên liệu hóa thạch gây ô nhiễm.', synonyms: ['coal', 'oil', 'natural gas'], hints: ['Fossil = hóa thạch, fuel = nhiên liệu', 'Coal, oil, gas là fossil fuels'] },
  { word: 'global warming', translation: 'nóng lên toàn cầu', pronunciation: '/ˌɡləʊbəl ˈwɔːrmɪŋ/', example: 'Global warming is a serious threat.', exampleTrans: 'Nóng lên toàn cầu là mối đe dọa nghiêm trọng.', synonyms: ['climate change', 'temperature rise'], hints: ['Global = toàn cầu, warming = ấm lên', 'Greenhouse effect causes global warming'] },
  { word: 'sustainable', translation: 'bền vững', pronunciation: '/səˈsteɪnəbl/', example: 'Sustainable energy sources are the future.', exampleTrans: 'Nguồn năng lượng bền vững là tương lai.', synonyms: ['eco-friendly', 'long-term', 'green'], hints: ['Sustain = duy trì, sustainable = có thể duy trì lâu', 'Sustainable development = phát triển bền vững'] },
  { word: 'species', translation: 'loài (sinh vật)', pronunciation: '/ˈspiːʃiːz/', example: 'Many species are endangered.', exampleTrans: 'Nhiều loài đang bị đe dọa.', synonyms: ['type', 'kind', 'variety'], hints: ['Species từ Latin = hình dạng/loại', 'Số ít và số nhiều đều là species'] },
];

const B2_ADVANCED_COMM: LangWordItem[] = [
  { word: 'articulate', translation: 'diễn đạt rõ ràng, lưu loát', pronunciation: '/ɑːrˈtɪkjʊleɪt/', example: 'She is very articulate in her speech.', exampleTrans: 'Cô ấy nói chuyện rất mạch lạc, rõ ràng.', synonyms: ['eloquent', 'fluent', 'expressive'], hints: ['Article = khớp, articulate = nói rõ từng khớp chữ', 'Đọc "ar-tik-yú-lit"'] },
  { word: 'elaborate', translation: 'trình bày chi tiết, tỉ mỉ', pronunciation: '/ɪˈlæbəreɪt/', example: 'Can you elaborate on that point?', exampleTrans: 'Bạn có thể trình bày chi tiết hơn về điểm đó không?', synonyms: ['expand', 'explain', 'detail'], hints: ['Labor = làm việc nhiều, elaborate = làm thêm chi tiết', 'Đọc "i-lab-ờ-reyt"'] },
  { word: 'convey', translation: 'truyền đạt, chuyển tải', pronunciation: '/kənˈveɪ/', example: 'She conveyed the message clearly.', exampleTrans: 'Cô ấy truyền đạt thông điệp rõ ràng.', synonyms: ['communicate', 'express', 'transmit'], hints: ['Con + vey = mang cùng nhau', 'Convey emotions = thể hiện cảm xúc'] },
  { word: 'persuade', translation: 'thuyết phục', pronunciation: '/pərˈsweɪd/', example: 'He persuaded her to join the team.', exampleTrans: 'Anh ấy thuyết phục cô ấy tham gia nhóm.', synonyms: ['convince', 'influence', 'argue'], hints: ['Per + suade = kéo hoàn toàn theo mình', 'Persuasive = có tính thuyết phục'] },
  { word: 'emphasize', translation: 'nhấn mạnh', pronunciation: '/ˈemfəsaɪz/', example: 'The teacher emphasized the importance of practice.', exampleTrans: 'Giáo viên nhấn mạnh tầm quan trọng của luyện tập.', synonyms: ['stress', 'highlight', 'underline'], hints: ['Emphasis = sự nhấn mạnh, emphasize = nhấn mạnh', 'Đọc "em-phờ-sayz"'] },
  { word: 'concise', translation: 'súc tích, ngắn gọn', pronunciation: '/kənˈsaɪs/', example: 'Write a concise summary.', exampleTrans: 'Viết một bản tóm tắt súc tích.', synonyms: ['brief', 'succinct', 'terse'], hints: ['Con + cise = cắt lại gọn gàng', 'Đối nghĩa: verbose = dài dòng, lan man'] },
  { word: 'ambiguous', translation: 'mơ hồ, không rõ ràng', pronunciation: '/æmˈbɪɡjuəs/', example: 'The instructions were ambiguous.', exampleTrans: 'Hướng dẫn thật mơ hồ.', synonyms: ['unclear', 'vague', 'puzzling'], hints: ['Ambi = hai phía, guous = dẫn đến = có thể hiểu hai cách', 'Ambiguity = sự mơ hồ'] },
  { word: 'comprehend', translation: 'hiểu, nắm bắt', pronunciation: '/ˌkɒmprɪˈhend/', example: 'Do you fully comprehend the instructions?', exampleTrans: 'Bạn có hiểu đầy đủ hướng dẫn không?', synonyms: ['understand', 'grasp', 'perceive'], hints: ['Com + prehend = nắm toàn bộ', 'Comprehension = sự hiểu biết; comprehend = động từ'] },
  { word: 'rhetoric', translation: 'hùng biện, kỹ thuật nói', pronunciation: '/ˈretərɪk/', example: 'The speech was full of powerful rhetoric.', exampleTrans: 'Bài phát biểu đầy hùng biện.', synonyms: ['oratory', 'eloquence', 'persuasion'], hints: ['Rhetoric = nghệ thuật nói, rhet-ờ-rik', 'Political rhetoric = hùng biện chính trị'] },
  { word: 'nuance', translation: 'sắc thái, khác biệt tinh tế', pronunciation: '/ˈnjuːɑːns/', example: 'Understanding nuances is key to fluency.', exampleTrans: 'Hiểu sắc thái là chìa khóa để nói lưu loát.', synonyms: ['subtlety', 'shade', 'distinction'], hints: ['Từ tiếng Pháp: nue = màu mây', 'Nuanced = có nhiều sắc thái'] },
];

// ─── A1 — Động từ mở rộng & Tính từ trái nghĩa ───────────────────────────────

const A1_MORE_VERBS: LangWordItem[] = [
  { word: 'buy', translation: 'mua', pronunciation: '/baɪ/', example: 'I buy books every month.', exampleTrans: 'Tôi mua sách mỗi tháng.', synonyms: ['purchase', 'get'], hints: ['Buy = mua, đọc "bai"', 'Buy vs sell: mua đối lập với bán'] },
  { word: 'sell', translation: 'bán', pronunciation: '/sel/', example: 'She sells vegetables at the market.', exampleTrans: 'Cô ấy bán rau ở chợ.', synonyms: ['trade', 'deal'], hints: ['Sell = bán, đọc "sel"', 'Seller = người bán, buyer = người mua'] },
  { word: 'teach', translation: 'dạy, giảng dạy', pronunciation: '/tiːtʃ/', example: 'He teaches math at school.', exampleTrans: 'Anh ấy dạy toán ở trường.', synonyms: ['instruct', 'educate'], hints: ['Teach = dạy, đọc "tich"', 'Teacher = giáo viên, taught = đã dạy (quá khứ)'] },
  { word: 'learn', translation: 'học, học được', pronunciation: '/lɜːrn/', example: 'I learn English every day.', exampleTrans: 'Tôi học tiếng Anh mỗi ngày.', synonyms: ['study', 'acquire'], hints: ['Learn = học, đọc "lơn"', 'Learner = người học'] },
  { word: 'cook', translation: 'nấu ăn', pronunciation: '/kʊk/', example: 'Mother cooks dinner every evening.', exampleTrans: 'Mẹ nấu bữa tối mỗi buổi chiều.', synonyms: ['prepare food', 'make'], hints: ['Cook = nấu ăn, đọc "kuk"', 'Cook cũng có nghĩa là đầu bếp (danh từ)'] },
  { word: 'clean', translation: 'dọn dẹp, lau chùi', pronunciation: '/kliːn/', example: 'We clean our room every Saturday.', exampleTrans: 'Chúng tôi dọn phòng mỗi thứ Bảy.', synonyms: ['tidy', 'wash'], hints: ['Clean = sạch sẽ / dọn dẹp, đọc "klin"', 'Clean energy = năng lượng sạch'] },
  { word: 'open', translation: 'mở', pronunciation: '/ˈəʊpən/', example: 'Open the window please.', exampleTrans: 'Mở cửa sổ ra.', synonyms: ['unlock', 'unclose'], hints: ['Open = mở, đọc "ô-pần"', 'Đối nghĩa: close/shut = đóng'] },
  { word: 'close', translation: 'đóng', pronunciation: '/kləʊz/', example: 'Close the door when you leave.', exampleTrans: 'Đóng cửa khi bạn ra ngoài.', synonyms: ['shut', 'seal'], hints: ['Close = đóng, đọc "clôz"', 'Closed = đã đóng; Closed sign = biển "Đóng cửa"'] },
  { word: 'give', translation: 'cho, tặng', pronunciation: '/ɡɪv/', example: 'Give the book to your friend.', exampleTrans: 'Đưa sách cho bạn của bạn.', synonyms: ['offer', 'provide'], hints: ['Give = đưa/cho, đọc "giv"', 'Give up = bỏ cuộc; give away = cho đi'] },
  { word: 'take', translation: 'lấy, mang', pronunciation: '/teɪk/', example: 'Take an umbrella today.', exampleTrans: 'Mang ô đi hôm nay.', synonyms: ['grab', 'carry'], hints: ['Take = lấy, đọc "têyk"', 'Take a photo = chụp ảnh; take a bus = đi xe buýt'] },
  { word: 'make', translation: 'làm, chế tạo', pronunciation: '/meɪk/', example: 'She makes her own clothes.', exampleTrans: 'Cô ấy tự may quần áo.', synonyms: ['create', 'build', 'do'], hints: ['Make = làm/tạo ra, đọc "mêyk"', 'Make a cake = nướng bánh; make friends = kết bạn'] },
  { word: 'come', translation: 'đến, tới', pronunciation: '/kʌm/', example: 'Come here, please.', exampleTrans: 'Lại đây đi.', synonyms: ['arrive', 'approach'], hints: ['Come = đến, đọc "kâm"', 'Come on! = Mau lên! / Nào!'] },
  { word: 'go', translation: 'đi', pronunciation: '/ɡəʊ/', example: 'Let\'s go to the park.', exampleTrans: 'Hãy đi đến công viên.', synonyms: ['leave', 'depart', 'travel'], hints: ['Go = đi, đọc "gô"', 'Let\'s go! = Đi nào!'] },
  { word: 'see', translation: 'nhìn thấy', pronunciation: '/siː/', example: 'I can see the mountains.', exampleTrans: 'Tôi có thể nhìn thấy những ngọn núi.', synonyms: ['look', 'observe'], hints: ['See = nhìn thấy, đọc "si"', 'See you! = Gặp lại bạn nhé!'] },
  { word: 'hear', translation: 'nghe thấy', pronunciation: '/hɪər/', example: 'I can hear music.', exampleTrans: 'Tôi nghe thấy tiếng nhạc.', synonyms: ['listen', 'perceive'], hints: ['Hear = nghe thấy, đọc "hia"', 'Khác hear (nghe thấy) và listen (chú ý nghe)'] },
  { word: 'speak', translation: 'nói, nói chuyện', pronunciation: '/spiːk/', example: 'Can you speak English?', exampleTrans: 'Bạn có thể nói tiếng Anh không?', synonyms: ['talk', 'say'], hints: ['Speak = nói, đọc "spik"', 'Speaker = người nói, loa (máy)'] },
  { word: 'know', translation: 'biết', pronunciation: '/nəʊ/', example: 'Do you know the answer?', exampleTrans: 'Bạn có biết câu trả lời không?', synonyms: ['understand', 'recognize'], hints: ['Know = biết, đọc "nô" (k không đọc)', 'Knowledge = kiến thức'] },
  { word: 'think', translation: 'nghĩ, suy nghĩ', pronunciation: '/θɪŋk/', example: 'Think before you speak.', exampleTrans: 'Hãy suy nghĩ trước khi nói.', synonyms: ['consider', 'believe'], hints: ['Think = nghĩ, đọc "think"', 'I think so = Tôi nghĩ vậy'] },
  { word: 'want', translation: 'muốn', pronunciation: '/wɒnt/', example: 'I want to learn English.', exampleTrans: 'Tôi muốn học tiếng Anh.', synonyms: ['desire', 'wish'], hints: ['Want = muốn, đọc "wont"', 'Want to = muốn làm gì đó'] },
  { word: 'need', translation: 'cần', pronunciation: '/niːd/', example: 'I need more time.', exampleTrans: 'Tôi cần thêm thời gian.', synonyms: ['require', 'must have'], hints: ['Need = cần, đọc "nid"', 'Need help? = Cần giúp đỡ không?'] },
];

const A1_OPPOSITES: LangWordItem[] = [
  { word: 'hot', translation: 'nóng', pronunciation: '/hɒt/', example: 'The soup is very hot.', exampleTrans: 'Bát súp rất nóng.', synonyms: ['warm', 'scorching'], hints: ['Hot = nóng, đọc "hot"', 'Đối nghĩa: cold = lạnh'] },
  { word: 'wet', translation: 'ướt', pronunciation: '/wet/', example: 'My clothes are wet.', exampleTrans: 'Quần áo tôi ướt rồi.', synonyms: ['damp', 'moist'], hints: ['Wet = ướt, đọc "wet"', 'Đối nghĩa: dry = khô'] },
  { word: 'dry', translation: 'khô', pronunciation: '/draɪ/', example: 'The clothes are dry now.', exampleTrans: 'Quần áo đã khô rồi.', synonyms: ['arid', 'parched'], hints: ['Dry = khô, đọc "drai"', 'Hair dryer = máy sấy tóc'] },
  { word: 'loud', translation: 'to (âm thanh)', pronunciation: '/laʊd/', example: 'The music is very loud.', exampleTrans: 'Âm nhạc rất to.', synonyms: ['noisy', 'booming'], hints: ['Loud = to tiếng, đọc "laud"', 'Đối nghĩa: quiet/soft = nhẹ nhàng, yên tĩnh'] },
  { word: 'quiet', translation: 'yên tĩnh, im lặng', pronunciation: '/ˈkwaɪət/', example: 'Please be quiet in the library.', exampleTrans: 'Làm ơn giữ yên lặng trong thư viện.', synonyms: ['silent', 'peaceful'], hints: ['Quiet = yên tĩnh, đọc "kwai-ờt"', 'Quiet! = Im lặng!'] },
  { word: 'light', translation: 'nhẹ, ánh sáng', pronunciation: '/laɪt/', example: 'This bag is very light.', exampleTrans: 'Chiếc túi này rất nhẹ.', synonyms: ['bright', 'featherlight'], hints: ['Light = nhẹ / ánh sáng, đọc "lait"', 'Light bulb = bóng đèn; lightweight = nhẹ cân'] },
  { word: 'heavy', translation: 'nặng', pronunciation: '/ˈhevi/', example: 'This box is too heavy.', exampleTrans: 'Cái hộp này quá nặng.', synonyms: ['weighty', 'massive'], hints: ['Heavy = nặng, đọc "hev-i"', 'Đối nghĩa: light = nhẹ'] },
  { word: 'old', translation: 'cũ, già', pronunciation: '/əʊld/', example: 'This is an old house.', exampleTrans: 'Đây là ngôi nhà cũ.', synonyms: ['aged', 'ancient'], hints: ['Old = cũ / già, đọc "ôld"', 'Old man = người đàn ông già'] },
  { word: 'new', translation: 'mới', pronunciation: '/njuː/', example: 'I have a new phone.', exampleTrans: 'Tôi có điện thoại mới.', synonyms: ['fresh', 'recent'], hints: ['New = mới, đọc "nyu"', 'Brand new = hoàn toàn mới'] },
  { word: 'full', translation: 'đầy, no', pronunciation: '/fʊl/', example: 'The glass is full of water.', exampleTrans: 'Ly đầy nước.', synonyms: ['filled', 'complete'], hints: ['Full = đầy / no, đọc "ful"', 'Full stomach = no bụng; full tank = bình đầy'] },
  { word: 'empty', translation: 'trống, rỗng', pronunciation: '/ˈempti/', example: 'The bottle is empty.', exampleTrans: 'Chai đã cạn rồi.', synonyms: ['vacant', 'hollow'], hints: ['Empty = rỗng, đọc "emp-ti"', 'Empty stomach = bụng đói'] },
  { word: 'easy', translation: 'dễ', pronunciation: '/ˈiːzi/', example: 'This exercise is very easy.', exampleTrans: 'Bài tập này rất dễ.', synonyms: ['simple', 'effortless'], hints: ['Easy = dễ, đọc "i-zi"', 'Đối nghĩa: difficult/hard = khó'] },
  { word: 'difficult', translation: 'khó', pronunciation: '/ˈdɪfɪkəlt/', example: 'This math problem is difficult.', exampleTrans: 'Bài toán này rất khó.', synonyms: ['hard', 'challenging'], hints: ['Difficult = khó, dif-ờ-kəlt', 'Difficulty = độ khó / sự khó khăn'] },
  { word: 'right', translation: 'đúng, phải', pronunciation: '/raɪt/', example: 'That is the right answer.', exampleTrans: 'Đó là câu trả lời đúng.', synonyms: ['correct', 'proper'], hints: ['Right = đúng / bên phải, đọc "rait"', 'You are right = Bạn đúng rồi'] },
  { word: 'wrong', translation: 'sai, lỗi', pronunciation: '/rɒŋ/', example: 'That answer is wrong.', exampleTrans: 'Câu trả lời đó sai rồi.', synonyms: ['incorrect', 'mistaken'], hints: ['Wrong = sai, đọc "rong"', 'Wrong number = sai số điện thoại'] },
];

// ─── A2 — Sức khỏe cơ bản & Hành động hàng ngày ─────────────────────────────

const A2_HEALTH_BASIC: LangWordItem[] = [
  { word: 'headache', translation: 'đau đầu', pronunciation: '/ˈhedeɪk/', example: 'I have a headache today.', exampleTrans: 'Hôm nay tôi bị đau đầu.', synonyms: ['migraine', 'head pain'], hints: ['Head = đầu, ache = đau, headache = đau đầu', 'Toothache = đau răng, stomachache = đau bụng'] },
  { word: 'fever', translation: 'sốt', pronunciation: '/ˈfiːvər/', example: 'She has a high fever.', exampleTrans: 'Cô ấy bị sốt cao.', synonyms: ['temperature', 'high temp'], hints: ['Fever = sốt, đọc "fi-vờ"', 'Have a fever = bị sốt'] },
  { word: 'cough', translation: 'ho', pronunciation: '/kɒf/', example: 'He has a bad cough.', exampleTrans: 'Anh ấy bị ho nặng.', synonyms: ['hack', 'throat clearing'], hints: ['Cough = ho, đọc "kof" (gh không đọc)', 'Cough syrup = siro ho'] },
  { word: 'cold', translation: 'bệnh cảm lạnh', pronunciation: '/kəʊld/', example: 'I caught a cold last week.', exampleTrans: 'Tuần trước tôi bị cảm.', synonyms: ['flu', 'runny nose'], hints: ['Cold = cảm lạnh / lạnh, đọc "côld"', 'Catch a cold = bị cảm; common cold = cảm thông thường'] },
  { word: 'pain', translation: 'đau đớn', pronunciation: '/peɪn/', example: 'She feels pain in her leg.', exampleTrans: 'Cô ấy cảm thấy đau ở chân.', synonyms: ['ache', 'hurt'], hints: ['Pain = đau, đọc "pêyn"', 'Painkiller = thuốc giảm đau'] },
  { word: 'dentist', translation: 'nha sĩ', pronunciation: '/ˈdentɪst/', example: 'Visit the dentist twice a year.', exampleTrans: 'Khám nha sĩ hai lần mỗi năm.', synonyms: ['dental doctor', 'oral doctor'], hints: ['Dent = răng (Latin), dentist = bác sĩ răng', 'Dental = liên quan đến răng'] },
  { word: 'healthy', translation: 'khỏe mạnh', pronunciation: '/ˈhelθi/', example: 'Eating well keeps you healthy.', exampleTrans: 'Ăn uống tốt giúp bạn khỏe mạnh.', synonyms: ['fit', 'well', 'strong'], hints: ['Health = sức khỏe, healthy = có sức khỏe', 'Stay healthy = giữ sức khỏe'] },
  { word: 'tired', translation: 'mệt mỏi', pronunciation: '/ˈtaɪərd/', example: 'She felt tired after the long trip.', exampleTrans: 'Cô ấy cảm thấy mệt sau chuyến đi dài.', synonyms: ['exhausted', 'weary'], hints: ['Tired = mệt, đọc "tai-ờd"', 'Tired of = chán (làm gì đó)'] },
  { word: 'rest', translation: 'nghỉ ngơi', pronunciation: '/rest/', example: 'Take a rest when you feel tired.', exampleTrans: 'Hãy nghỉ ngơi khi bạn mệt.', synonyms: ['relax', 'break'], hints: ['Rest = nghỉ ngơi, đọc "rest"', 'Restaurant = nơi phục hồi sức khỏe (gốc tiếng Pháp)'] },
  { word: 'sleep', translation: 'ngủ', pronunciation: '/sliːp/', example: 'Adults need 7-8 hours of sleep.', exampleTrans: 'Người lớn cần 7-8 tiếng ngủ.', synonyms: ['slumber', 'nap'], hints: ['Sleep = ngủ, đọc "slip"', 'Sleepy = buồn ngủ; oversleep = ngủ quá giờ'] },
  { word: 'appointment', translation: 'cuộc hẹn', pronunciation: '/əˈpɔɪntmənt/', example: 'I have a doctor\'s appointment.', exampleTrans: 'Tôi có hẹn với bác sĩ.', synonyms: ['meeting', 'booking'], hints: ['Appoint = bổ nhiệm / định trước, appointment = giờ hẹn', 'Make an appointment = đặt lịch hẹn'] },
  { word: 'pharmacy', translation: 'nhà thuốc', pronunciation: '/ˈfɑːrməsi/', example: 'Get medicine from the pharmacy.', exampleTrans: 'Mua thuốc ở nhà thuốc.', synonyms: ['drugstore', 'chemist'], hints: ['Pharma = thuốc (Hy Lạp), pharmacy = hiệu thuốc', 'Pharmacist = dược sĩ'] },
  { word: 'bandage', translation: 'băng bó, băng vết thương', pronunciation: '/ˈbændɪdʒ/', example: 'Put a bandage on the wound.', exampleTrans: 'Đặt băng lên vết thương.', synonyms: ['dressing', 'wrap'], hints: ['Band = dải, bandage = dải băng bó', 'Đọc "ben-dij"'] },
  { word: 'allergy', translation: 'dị ứng', pronunciation: '/ˈælərdʒi/', example: 'I have an allergy to dust.', exampleTrans: 'Tôi bị dị ứng với bụi.', synonyms: ['sensitivity', 'intolerance'], hints: ['Allergy = dị ứng, al-ờ-ji', 'Allergic to = bị dị ứng với'] },
  { word: 'injury', translation: 'chấn thương, vết thương', pronunciation: '/ˈɪndʒəri/', example: 'He got an injury during the game.', exampleTrans: 'Anh ấy bị chấn thương trong trận đấu.', synonyms: ['wound', 'harm', 'damage'], hints: ['Injure = làm bị thương, injury = vết thương', 'Sports injury = chấn thương thể thao'] },
  { word: 'dizzy', translation: 'chóng mặt', pronunciation: '/ˈdɪzi/', example: 'I feel dizzy after spinning.', exampleTrans: 'Tôi cảm thấy chóng mặt sau khi quay.', synonyms: ['lightheaded', 'unsteady'], hints: ['Dizzy = chóng mặt, đọc "diz-i"', 'Dizzy spell = cơn chóng mặt'] },
  { word: 'sneeze', translation: 'hắt hơi', pronunciation: '/sniːz/', example: 'Cover your mouth when you sneeze.', exampleTrans: 'Che miệng khi bạn hắt hơi.', synonyms: ['achoo'], hints: ['Sneeze = hắt hơi, đọc "sniz"', 'Bless you! = câu nói khi ai hắt hơi'] },
  { word: 'nausea', translation: 'buồn nôn', pronunciation: '/ˈnɔːziə/', example: 'She felt nausea on the ship.', exampleTrans: 'Cô ấy cảm thấy buồn nôn trên tàu.', synonyms: ['sickness', 'queasiness'], hints: ['Nautic = biển, nausea = say tàu xe', 'Đọc "nô-zi-ờ"'] },
  { word: 'blood pressure', translation: 'huyết áp', pronunciation: '/ˈblʌd ˈpreʃər/', example: 'Check your blood pressure regularly.', exampleTrans: 'Kiểm tra huyết áp thường xuyên.', synonyms: ['BP', 'hypertension'], hints: ['Blood = máu, pressure = áp lực', 'High blood pressure = cao huyết áp'] },
  { word: 'prescription', translation: 'đơn thuốc', pronunciation: '/prɪˈskrɪpʃən/', example: 'The doctor gave me a prescription.', exampleTrans: 'Bác sĩ cho tôi đơn thuốc.', synonyms: ['medical order', 'Rx'], hints: ['Pre + script = viết trước, prescription = đơn thuốc viết trước', 'Prescription medicine = thuốc kê đơn'] },
  { word: 'X-ray', translation: 'chụp X-quang', pronunciation: '/ˈeks reɪ/', example: 'The doctor ordered an X-ray.', exampleTrans: 'Bác sĩ chỉ định chụp X-quang.', synonyms: ['radiograph', 'scan'], hints: ['X-ray = tia X, khám xương bằng tia X', 'Chest X-ray = chụp phổi'] },
];

// ─── B2 — Tư duy phản biện & Triết lý ────────────────────────────────────────

const B2_CRITICAL: LangWordItem[] = [
  { word: 'debate', translation: 'tranh luận, thảo luận', pronunciation: '/dɪˈbeɪt/', example: 'We had a heated debate.', exampleTrans: 'Chúng tôi có một cuộc tranh luận sôi nổi.', synonyms: ['argue', 'discuss', 'contest'], hints: ['De + bate = đánh mạnh về ý kiến', 'Debate club = câu lạc bộ tranh luận'] },
  { word: 'contradict', translation: 'mâu thuẫn, bác bỏ', pronunciation: '/ˌkɒntrəˈdɪkt/', example: 'His actions contradict his words.', exampleTrans: 'Hành động của anh ấy mâu thuẫn với lời nói.', synonyms: ['oppose', 'deny', 'negate'], hints: ['Contra = ngược lại, dict = nói', 'Contradiction = sự mâu thuẫn'] },
  { word: 'assumption', translation: 'giả định, điều coi là đương nhiên', pronunciation: '/əˈsʌmpʃən/', example: 'Don\'t make assumptions without evidence.', exampleTrans: 'Đừng đưa ra giả định mà không có bằng chứng.', synonyms: ['presumption', 'supposition'], hints: ['Assume = cho là đương nhiên, assumption = điều giả định', 'Đọc "ờ-sâm-shần"'] },
  { word: 'bias', translation: 'thiên kiến, thành kiến', pronunciation: '/ˈbaɪəs/', example: 'Try to avoid personal bias.', exampleTrans: 'Cố tránh thiên kiến cá nhân.', synonyms: ['prejudice', 'partiality'], hints: ['Bias = nghiêng về một phía, đọc "bai-ờs"', 'Unbiased = khách quan, không thiên vị'] },
  { word: 'objective', translation: 'khách quan, mục tiêu', pronunciation: '/əbˈdʒektɪv/', example: 'Try to be objective in your assessment.', exampleTrans: 'Hãy khách quan trong đánh giá của bạn.', synonyms: ['impartial', 'neutral', 'goal'], hints: ['Object = vật thể (không có cảm xúc), objective = nhìn như vật thể = khách quan', 'Objective also = mục tiêu (danh từ)'] },
  { word: 'subjective', translation: 'chủ quan', pronunciation: '/səbˈdʒektɪv/', example: 'Beauty is subjective.', exampleTrans: 'Vẻ đẹp là điều chủ quan.', synonyms: ['personal', 'individual'], hints: ['Subject = chủ thể, subjective = theo quan điểm cá nhân', 'Đối nghĩa: objective = khách quan'] },
  { word: 'logical', translation: 'hợp logic, có lý', pronunciation: '/ˈlɒdʒɪkl/', example: 'That is a logical conclusion.', exampleTrans: 'Đó là một kết luận hợp logic.', synonyms: ['rational', 'reasonable', 'coherent'], hints: ['Logic = lý luận, logical = tuân theo logic', 'Logical thinking = tư duy logic'] },
  { word: 'rational', translation: 'có lý trí, hợp lý', pronunciation: '/ˈræʃənl/', example: 'Make rational decisions.', exampleTrans: 'Hãy đưa ra quyết định có lý trí.', synonyms: ['sensible', 'reasonable', 'sane'], hints: ['Ratio = tỷ lệ, rational = dựa trên tỷ lệ/lý luận', 'Irrational = phi lý'] },
  { word: 'imply', translation: 'ngụ ý, ám chỉ', pronunciation: '/ɪmˈplaɪ/', example: 'What do you imply by that?', exampleTrans: 'Bạn ngụ ý gì với điều đó?', synonyms: ['suggest', 'hint', 'insinuate'], hints: ['Im + ply = gấp vào trong = ý nghĩa ẩn', 'Implication = hàm ý, ý nghĩa gián tiếp'] },
  { word: 'consequence', translation: 'hậu quả, kết quả', pronunciation: '/ˈkɒnsɪkwəns/', example: 'Think about the consequences of your actions.', exampleTrans: 'Hãy suy nghĩ về hậu quả của hành động.', synonyms: ['result', 'outcome', 'effect'], hints: ['Con + sequence = theo sau, consequence = điều theo sau', 'As a consequence = vì vậy'] },
  { word: 'principle', translation: 'nguyên tắc', pronunciation: '/ˈprɪnsɪpl/', example: 'Follow your principles.', exampleTrans: 'Hãy tuân theo nguyên tắc của bạn.', synonyms: ['rule', 'guideline', 'value'], hints: ['Prince = lãnh đạo, principle = quy tắc dẫn đầu', 'Principled = có nguyên tắc'] },
  { word: 'abstract', translation: 'trừu tượng', pronunciation: '/ˈæbstrækt/', example: 'The concept is too abstract.', exampleTrans: 'Khái niệm này quá trừu tượng.', synonyms: ['theoretical', 'conceptual', 'intangible'], hints: ['Ab + stract = kéo ra khỏi thực tế', 'Abstract art = nghệ thuật trừu tượng'] },
  { word: 'concrete', translation: 'cụ thể, bê tông', pronunciation: '/ˈkɒŋkriːt/', example: 'Give concrete examples.', exampleTrans: 'Hãy đưa ra ví dụ cụ thể.', synonyms: ['specific', 'tangible', 'definite'], hints: ['Con + crete = lớp lại thành khối chắc = cụ thể', 'Đối nghĩa: abstract = trừu tượng'] },
  { word: 'complex', translation: 'phức tạp', pronunciation: '/ˈkɒmpleks/', example: 'This is a very complex problem.', exampleTrans: 'Đây là vấn đề rất phức tạp.', synonyms: ['complicated', 'intricate'], hints: ['Com + plex = nhiều lớp đan vào nhau', 'Complexity = sự phức tạp'] },
  { word: 'infer', translation: 'suy luận, rút ra kết luận', pronunciation: '/ɪnˈfɜːr/', example: 'From the data, we can infer several things.', exampleTrans: 'Từ dữ liệu, chúng ta có thể suy luận một số điều.', synonyms: ['deduce', 'conclude', 'derive'], hints: ['In + fer = mang vào = kéo ý từ bên trong', 'Inference = kết luận suy ra'] },
  { word: 'validity', translation: 'tính hợp lệ, hiệu lực', pronunciation: '/vəˈlɪdɪti/', example: 'Check the validity of the argument.', exampleTrans: 'Kiểm tra tính hợp lệ của lập luận.', synonyms: ['legitimacy', 'soundness'], hints: ['Valid = có giá trị, validity = mức độ có giá trị', 'Validate = xác nhận hợp lệ'] },
  { word: 'counterargument', translation: 'lập luận phản biện', pronunciation: '/ˈkaʊntərˌɑːrɡjumənt/', example: 'Present a strong counterargument.', exampleTrans: 'Đưa ra một lập luận phản biện mạnh.', synonyms: ['rebuttal', 'objection'], hints: ['Counter = ngược lại, argument = lập luận', 'Đọc "kaun-tờ-ar-gyú-mənt"'] },
  { word: 'critique', translation: 'phê bình, phân tích phê phán', pronunciation: '/krɪˈtiːk/', example: 'Write a critique of the article.', exampleTrans: 'Viết một bài phê bình về bài báo.', synonyms: ['criticism', 'review', 'analysis'], hints: ['Critic = người phê bình, critique = bài phê bình', 'Đọc "kri-tik"'] },
  { word: 'synthesize', translation: 'tổng hợp', pronunciation: '/ˈsɪnθəsaɪz/', example: 'Synthesize information from multiple sources.', exampleTrans: 'Tổng hợp thông tin từ nhiều nguồn.', synonyms: ['combine', 'integrate', 'merge'], hints: ['Syn = cùng nhau, thesis = đặt ra', 'Synthesis = sự tổng hợp'] },
  { word: 'credible', translation: 'đáng tin cậy', pronunciation: '/ˈkredɪbl/', example: 'Use credible sources in your paper.', exampleTrans: 'Dùng nguồn đáng tin cậy trong bài luận.', synonyms: ['trustworthy', 'reliable', 'believable'], hints: ['Credit = tin tưởng, credible = đáng được tin', 'Credibility = độ tin cậy'] },
  { word: 'acknowledge', translation: 'thừa nhận, công nhận', pronunciation: '/əkˈnɒlɪdʒ/', example: 'Acknowledge your mistakes and learn.', exampleTrans: 'Thừa nhận lỗi của bạn và học hỏi.', synonyms: ['admit', 'recognize', 'accept'], hints: ['Ac + knowledge = biết và chấp nhận', 'Acknowledgement = lời cảm ơn / thừa nhận'] },
  { word: 'distinguish', translation: 'phân biệt', pronunciation: '/dɪˈstɪŋɡwɪʃ/', example: 'Can you distinguish between the two?', exampleTrans: 'Bạn có thể phân biệt hai cái đó không?', synonyms: ['differentiate', 'separate', 'tell apart'], hints: ['Dis + tinguish = làm nổi bật sự khác nhau', 'Distinguished = nổi tiếng, xuất sắc'] },
  { word: 'relevant', translation: 'liên quan, phù hợp', pronunciation: '/ˈreləvənt/', example: 'Provide relevant information only.', exampleTrans: 'Chỉ cung cấp thông tin liên quan.', synonyms: ['pertinent', 'applicable', 'related'], hints: ['Relev = liên quan, relevant = có liên quan', 'Irrelevant = không liên quan'] },
  { word: 'consistent', translation: 'nhất quán', pronunciation: '/kənˈsɪstənt/', example: 'Be consistent in your arguments.', exampleTrans: 'Hãy nhất quán trong lập luận.', synonyms: ['coherent', 'stable', 'uniform'], hints: ['Con + sist = đứng cùng nhau, consistent = không mâu thuẫn', 'Consistency = tính nhất quán'] },
  { word: 'skeptical', translation: 'hoài nghi', pronunciation: '/ˈskeptɪkl/', example: 'I am skeptical about that claim.', exampleTrans: 'Tôi hoài nghi về tuyên bố đó.', synonyms: ['doubtful', 'questioning', 'uncertain'], hints: ['Skeptic = người hay đặt câu hỏi, skeptical = đang hoài nghi', 'Đọc "skep-ti-kəl"'] },
];

// ─── A1 — Tháng, Ngày trong tuần & Mùa ───────────────────────────────────────

const A1_CALENDAR: LangWordItem[] = [
  { word: 'January', translation: 'tháng Một', pronunciation: '/ˈdʒænjueri/', example: 'January is the first month of the year.', exampleTrans: 'Tháng Một là tháng đầu năm.', synonyms: ['first month'], hints: ['January = Janus (thần hai mặt La Mã)', 'Jan = viết tắt của January'] },
  { word: 'February', translation: 'tháng Hai', pronunciation: '/ˈfebrueri/', example: 'February has 28 or 29 days.', exampleTrans: 'Tháng Hai có 28 hoặc 29 ngày.', synonyms: ['second month'], hints: ['February = Februa (lễ thanh tẩy La Mã)', 'Feb = viết tắt; shortest month'] },
  { word: 'March', translation: 'tháng Ba', pronunciation: '/mɑːrtʃ/', example: 'Spring begins in March.', exampleTrans: 'Mùa xuân bắt đầu vào tháng Ba.', synonyms: ['third month'], hints: ['March = Mars (thần chiến tranh La Mã)', 'March cũng có nghĩa là diễu hành'] },
  { word: 'April', translation: 'tháng Tư', pronunciation: '/ˈeɪprəl/', example: 'April Fool\'s Day is April 1st.', exampleTrans: 'Ngày Cá tháng Tư là ngày 1 tháng Tư.', synonyms: ['fourth month'], hints: ['April = Aperire (mở ra, La tinh)', 'April Fool = trò đùa tháng Tư'] },
  { word: 'May', translation: 'tháng Năm', pronunciation: '/meɪ/', example: 'May is a beautiful month.', exampleTrans: 'Tháng Năm là tháng đẹp trời.', synonyms: ['fifth month'], hints: ['May = Maia (nữ thần đất La Mã)', 'May cũng là động từ: may = có thể'] },
  { word: 'June', translation: 'tháng Sáu', pronunciation: '/dʒuːn/', example: 'Summer holidays start in June.', exampleTrans: 'Kỳ nghỉ hè bắt đầu vào tháng Sáu.', synonyms: ['sixth month'], hints: ['June = Juno (nữ thần hôn nhân La Mã)', 'June is a beautiful name too'] },
  { word: 'July', translation: 'tháng Bảy', pronunciation: '/dʒuˈlaɪ/', example: 'July 4th is Independence Day in the US.', exampleTrans: 'Ngày 4 tháng 7 là Ngày Độc lập ở Mỹ.', synonyms: ['seventh month'], hints: ['July = Julius Caesar đặt tên', 'Jul = viết tắt'] },
  { word: 'August', translation: 'tháng Tám', pronunciation: '/ˈɔːɡəst/', example: 'It is very hot in August.', exampleTrans: 'Trời rất nóng vào tháng Tám.', synonyms: ['eighth month'], hints: ['August = Augustus Caesar đặt tên', 'Aug = viết tắt'] },
  { word: 'September', translation: 'tháng Chín', pronunciation: '/sepˈtembər/', example: 'School starts in September.', exampleTrans: 'Trường học bắt đầu vào tháng Chín.', synonyms: ['ninth month'], hints: ['Septem = bảy trong tiếng Latin (lịch La Mã cũ)', 'Sep = viết tắt'] },
  { word: 'October', translation: 'tháng Mười', pronunciation: '/ɒkˈtəʊbər/', example: 'Halloween is in October.', exampleTrans: 'Halloween là vào tháng Mười.', synonyms: ['tenth month'], hints: ['Octo = tám trong Latin (lịch cũ)', 'Oct = viết tắt; Octoberfest = lễ bia Đức'] },
  { word: 'November', translation: 'tháng Mười Một', pronunciation: '/nəʊˈvembər/', example: 'It gets cold in November.', exampleTrans: 'Trời lạnh dần vào tháng Mười Một.', synonyms: ['eleventh month'], hints: ['Novem = chín trong Latin (lịch cũ)', 'Nov = viết tắt'] },
  { word: 'December', translation: 'tháng Mười Hai', pronunciation: '/dɪˈsembər/', example: 'Christmas is in December.', exampleTrans: 'Giáng sinh là vào tháng Mười Hai.', synonyms: ['twelfth month', 'last month'], hints: ['Decem = mười trong Latin (lịch cũ)', 'Dec = viết tắt; Happy New Year!'] },
  { word: 'Monday', translation: 'thứ Hai', pronunciation: '/ˈmʌndeɪ/', example: 'School starts on Monday.', exampleTrans: 'Trường học bắt đầu vào thứ Hai.', synonyms: ['first weekday'], hints: ['Monday = Moon\'s Day = ngày của Mặt Trăng', 'Mon = viết tắt'] },
  { word: 'Tuesday', translation: 'thứ Ba', pronunciation: '/ˈtjuːzdeɪ/', example: 'We have math on Tuesday.', exampleTrans: 'Chúng tôi có tiết Toán vào thứ Ba.', synonyms: ['second weekday'], hints: ['Tuesday = Tiw\'s Day = ngày thần chiến tranh Tiw', 'Tue = viết tắt'] },
  { word: 'Wednesday', translation: 'thứ Tư', pronunciation: '/ˈwenzdeɪ/', example: 'We go swimming on Wednesday.', exampleTrans: 'Chúng tôi đi bơi vào thứ Tư.', synonyms: ['midweek'], hints: ['Wednesday = Woden\'s Day = ngày thần Woden (Odin)', 'Wed = viết tắt; d ở giữa không đọc'] },
  { word: 'Thursday', translation: 'thứ Năm', pronunciation: '/ˈθɜːrzdeɪ/', example: 'Library day is Thursday.', exampleTrans: 'Ngày thư viện là thứ Năm.', synonyms: ['fourth weekday'], hints: ['Thursday = Thor\'s Day = ngày thần sấm Thor', 'Thu = viết tắt'] },
  { word: 'Friday', translation: 'thứ Sáu', pronunciation: '/ˈfraɪdeɪ/', example: 'TGIF! Thank God It\'s Friday!', exampleTrans: 'Cảm ơn Trời vì hôm nay là thứ Sáu!', synonyms: ['end of workweek'], hints: ['Friday = Frigg\'s Day = ngày nữ thần Frigg', 'Black Friday = thứ Sáu giảm giá lớn'] },
  { word: 'Saturday', translation: 'thứ Bảy', pronunciation: '/ˈsætərdeɪ/', example: 'I sleep in on Saturday morning.', exampleTrans: 'Tôi ngủ nướng sáng thứ Bảy.', synonyms: ['weekend'], hints: ['Saturday = Saturn\'s Day = ngày thần nông Saturn', 'Sat = viết tắt'] },
  { word: 'Sunday', translation: 'Chủ nhật', pronunciation: '/ˈsʌndeɪ/', example: 'Family gathers on Sunday.', exampleTrans: 'Gia đình quây quần vào Chủ nhật.', synonyms: ['day off', 'weekend'], hints: ['Sunday = Sun\'s Day = ngày của Mặt Trời', 'Sun = viết tắt'] },
  { word: 'spring', translation: 'mùa xuân', pronunciation: '/sprɪŋ/', example: 'Flowers bloom in spring.', exampleTrans: 'Hoa nở vào mùa xuân.', synonyms: ['vernal season'], hints: ['Spring = mùa xuân / nước suối / nhảy lên', 'Springtime = mùa xuân'] },
  { word: 'summer', translation: 'mùa hè', pronunciation: '/ˈsʌmər/', example: 'Summer is hot and sunny.', exampleTrans: 'Mùa hè nóng và nắng.', synonyms: ['warm season'], hints: ['Summer = mùa hè, đọc "sâm-ờ"', 'Summer vacation = kỳ nghỉ hè'] },
  { word: 'autumn', translation: 'mùa thu', pronunciation: '/ˈɔːtəm/', example: 'Leaves fall in autumn.', exampleTrans: 'Lá rơi vào mùa thu.', synonyms: ['fall', 'harvest season'], hints: ['Autumn (Anh) = fall (Mỹ) = mùa thu', 'Đọc "o-tầm"'] },
  { word: 'winter', translation: 'mùa đông', pronunciation: '/ˈwɪntər/', example: 'It snows in winter.', exampleTrans: 'Trời có tuyết vào mùa đông.', synonyms: ['cold season'], hints: ['Winter = mùa đông, win-tờ', 'Wintertime = mùa đông; winter coat = áo mùa đông'] },
  { word: 'holiday', translation: 'ngày nghỉ lễ', pronunciation: '/ˈhɒlɪdeɪ/', example: 'National Day is a holiday.', exampleTrans: 'Quốc khánh là ngày nghỉ lễ.', synonyms: ['festival day', 'day off'], hints: ['Holy + day = ngày thánh = ngày lễ', 'On holiday = đang nghỉ phép'] },
  { word: 'birthday', translation: 'sinh nhật', pronunciation: '/ˈbɜːrθdeɪ/', example: 'Happy birthday to you!', exampleTrans: 'Chúc mừng sinh nhật bạn!', synonyms: ['anniversary'], hints: ['Birth + day = ngày sinh ra', 'Birthday cake = bánh sinh nhật; birthday party = tiệc sinh nhật'] },
  { word: 'New Year', translation: 'năm mới, Tết dương lịch', pronunciation: '/njuː jɪər/', example: 'Happy New Year!', exampleTrans: 'Chúc mừng năm mới!', synonyms: ['New Year\'s Day', 'January 1st'], hints: ['New = mới, Year = năm', 'New Year\'s Eve = đêm giao thừa'] },
  { word: 'festival', translation: 'lễ hội', pronunciation: '/ˈfestɪvl/', example: 'The spring festival is colorful.', exampleTrans: 'Lễ hội mùa xuân rất rực rỡ.', synonyms: ['celebration', 'fair', 'carnival'], hints: ['Festive = vui nhộn, festival = sự kiện vui nhộn', 'Music festival = lễ hội âm nhạc'] },
  { word: 'weekend', translation: 'cuối tuần', pronunciation: '/ˈwiːkend/', example: 'We rest on the weekend.', exampleTrans: 'Chúng tôi nghỉ ngơi vào cuối tuần.', synonyms: ['days off'], hints: ['Week = tuần, end = kết thúc', 'Weekday = ngày trong tuần (thứ Hai → thứ Sáu)'] },
  { word: 'season', translation: 'mùa, thời tiết', pronunciation: '/ˈsiːzən/', example: 'My favorite season is autumn.', exampleTrans: 'Mùa yêu thích của tôi là mùa thu.', synonyms: ['time of year', 'period'], hints: ['Season = mùa trong năm, si-zần', 'Seasoning = gia vị (nghĩa khác)'] },
  { word: 'calendar', translation: 'lịch, bảng lịch', pronunciation: '/ˈkælɪndər/', example: 'Check the calendar for the date.', exampleTrans: 'Kiểm tra lịch để biết ngày.', synonyms: ['schedule', 'planner'], hints: ['Calendar = lịch, cal-ần-dờ', 'Wall calendar = lịch treo tường'] },
  { word: 'event', translation: 'sự kiện', pronunciation: '/ɪˈvent/', example: 'The school event is on Friday.', exampleTrans: 'Sự kiện của trường diễn ra vào thứ Sáu.', synonyms: ['occasion', 'activity'], hints: ['Event = sự kiện, đọc "i-vent"', 'Special event = sự kiện đặc biệt'] },
  { word: 'celebrate', translation: 'kỷ niệm, ăn mừng', pronunciation: '/ˈselɪbreɪt/', example: 'We celebrate birthdays together.', exampleTrans: 'Chúng tôi ăn mừng sinh nhật cùng nhau.', synonyms: ['party', 'commemorate'], hints: ['Celebrate = tôn vinh / ăn mừng, sel-ờ-brêyt', 'Celebration = sự ăn mừng, tiệc'] },
  { word: 'anniversary', translation: 'kỷ niệm (ngày)', pronunciation: '/ˌænɪˈvɜːrsəri/', example: 'Today is our wedding anniversary.', exampleTrans: 'Hôm nay là ngày kỷ niệm đám cưới của chúng tôi.', synonyms: ['commemoration', 'birthday'], hints: ['Anni = năm, verse = quay lại, anniversary = ngày quay lại hằng năm', 'Đọc "en-ờ-vơ-sờ-ri"'] },
  { word: 'midnight', translation: 'nửa đêm', pronunciation: '/ˈmɪdnaɪt/', example: 'We welcomed the new year at midnight.', exampleTrans: 'Chúng tôi đón năm mới vào lúc nửa đêm.', synonyms: ['12am', 'dead of night'], hints: ['Mid = giữa, night = đêm', 'At midnight = vào lúc 12 giờ đêm'] },
];

// ─── Tổng hợp thành các set ───────────────────────────────────────────────────

export const LANG_GOLD_DATASET: LangGoldSet[] = [
  // ── A1 Sets ─────────────────────────────────────────────────────────────────
  {
    level: 'A1',
    title: 'Tiếng Anh A1 — Gia đình & Màu sắc',
    description: '100 từ cơ bản nhất cho người mới bắt đầu — chủ đề gia đình và màu sắc',
    topic: 'family-colors',
    words: [...A1_FAMILY, ...A1_COLORS, ...A1_NUMBERS, ...A1_BODY],
  },
  {
    level: 'A1',
    title: 'Tiếng Anh A1 — Thức ăn & Đồ vật & Động vật',
    description: '100 từ vựng về thức ăn, đồ dùng hàng ngày và động vật quen thuộc',
    topic: 'food-objects-animals',
    words: [...A1_FOOD, ...A1_OBJECTS, ...A1_ANIMALS, ...A1_VERBS],
  },
  // ── A2 Sets ─────────────────────────────────────────────────────────────────
  {
    level: 'A2',
    title: 'Tiếng Anh A2 — Trường học & Thời tiết & Phương tiện',
    description: '100 từ sơ cấp về trường học, thời tiết và phương tiện giao thông',
    topic: 'school-weather-transport',
    words: [...A2_SCHOOL, ...A2_WEATHER, ...A2_TRANSPORT, ...A2_JOBS.slice(0, 8)],
  },
  {
    level: 'A2',
    title: 'Tiếng Anh A2 — Cảm xúc & Thời gian & Tính từ',
    description: '100 từ diễn tả cảm xúc, thời gian và các tính từ thông dụng',
    topic: 'emotions-time-adjectives',
    words: [...A2_EMOTIONS, ...A2_TIME, ...A2_ADJECTIVES, ...A2_JOBS.slice(4)],
  },
  // ── B1 Sets ─────────────────────────────────────────────────────────────────
  {
    level: 'B1',
    title: 'Tiếng Anh B1 — Thiên nhiên & Sức khỏe & Xã hội',
    description: '100 từ trung cấp về thiên nhiên, sức khỏe và các vấn đề xã hội',
    topic: 'nature-health-society',
    words: [...B1_NATURE, ...B1_HEALTH, ...B1_SOCIETY],
  },
  {
    level: 'B1',
    title: 'Tiếng Anh B1 — Khoa học & Nghệ thuật & Kinh doanh',
    description: '100 từ nâng cao về khoa học, nghệ thuật, kinh doanh và giao tiếp',
    topic: 'science-arts-business',
    words: [...B1_SCIENCE, ...B1_ARTS, ...B1_BUSINESS, ...B1_COMMUNICATION],
  },
  // ── A1 mở rộng ──────────────────────────────────────────────────────────────
  {
    level: 'A1',
    title: 'Tiếng Anh A1 — Nhà cửa & Quần áo & Địa điểm',
    description: 'Từ vựng về phòng nhà, trang phục và các địa điểm thường gặp',
    topic: 'home-clothes-places',
    words: [...A1_HOME, ...A1_CLOTHES, ...A1_PLACES],
  },
  {
    level: 'A1',
    title: 'Tiếng Anh A1 — Thể thao & Động từ & Tính từ',
    description: 'Các môn thể thao, động từ thường dùng và tính từ đối lập',
    topic: 'sports-verbs-adjectives',
    words: [...A1_SPORTS, ...A1_MORE_VERBS, ...A1_OPPOSITES],
  },
  {
    level: 'A1',
    title: 'Tiếng Anh A1 — Tháng, Ngày & Mùa',
    description: '12 tháng, 7 ngày trong tuần, 4 mùa và từ vựng thời gian cơ bản',
    topic: 'calendar-time',
    words: [...A1_CALENDAR],
  },
  // ── A2 mở rộng ──────────────────────────────────────────────────────────────
  {
    level: 'A2',
    title: 'Tiếng Anh A2 — Du lịch & Mua sắm',
    description: 'Từ vựng thiết yếu khi đi du lịch và mua sắm',
    topic: 'travel-shopping',
    words: [...A2_TRAVEL, ...A2_SHOPPING],
  },
  {
    level: 'A2',
    title: 'Tiếng Anh A2 — Công nghệ & Thực phẩm',
    description: 'Từ vựng về công nghệ thường dùng và các loại thực phẩm',
    topic: 'technology-food',
    words: [...A2_TECHNOLOGY, ...A2_FOOD2],
  },
  {
    level: 'A2',
    title: 'Tiếng Anh A2 — Sức khỏe cơ bản',
    description: 'Từ vựng về sức khỏe, triệu chứng và chăm sóc y tế cơ bản',
    topic: 'health-basic',
    words: [...A2_HEALTH_BASIC],
  },
  // ── B2 Sets ─────────────────────────────────────────────────────────────────
  {
    level: 'B2',
    title: 'Tiếng Anh B2 — Học thuật & Nghề nghiệp',
    description: 'Từ vựng học thuật và chuyên môn cho trình độ B2',
    topic: 'academic-professional',
    words: [...B2_ACADEMIC, ...B2_PROFESSIONAL],
  },
  {
    level: 'B2',
    title: 'Tiếng Anh B2 — Môi trường & Giao tiếp nâng cao',
    description: 'Từ vựng về môi trường và kỹ năng giao tiếp nâng cao',
    topic: 'environment-communication',
    words: [...B2_ENVIRONMENT, ...B2_ADVANCED_COMM],
  },
  {
    level: 'B2',
    title: 'Tiếng Anh B2 — Tư duy phản biện',
    description: 'Từ vựng về tư duy logic, triết học và lập luận học thuật',
    topic: 'critical-thinking',
    words: [...B2_CRITICAL],
  },
];

// ─── Parser text format cho từng set ─────────────────────────────────────────
// Định dạng: "word - translation /pronunciation/"
// Dùng để test parser endpoint POST /language/parse-text

export function toParserText(words: LangWordItem[]): string {
  return words.map(w => `${w.word} - ${w.translation} /${w.pronunciation.replace(/\//g, '')}/`).join('\n');
}

export function toFullParserText(words: LangWordItem[]): string {
  return words.map(w => {
    const parts = [`${w.word} - ${w.translation}`];
    if (w.pronunciation) parts.push(w.pronunciation);
    return parts.join(' ');
  }).join('\n');
}

// ─── Validate từng item theo tiêu chuẩn ngoaingu1.md ─────────────────────────

export interface LangWordValidation {
  word: string;
  score: number;
  missing: string[];
  issues: string[];
}

export function validateWord(item: LangWordItem): LangWordValidation {
  const missing: string[] = [];
  const issues: string[] = [];
  let score = 0;

  if (item.word?.trim()) score += 25; else missing.push('word');
  if (item.translation?.trim()) score += 25; else missing.push('translation');
  if (item.pronunciation?.trim()) score += 20; else missing.push('pronunciation');
  if (item.example?.trim()) {
    score += 15;
    if (item.example.split(' ').length < 3) issues.push('Câu ví dụ quá ngắn');
  } else missing.push('example');
  if (item.exampleTrans?.trim()) score += 5; else missing.push('exampleTrans');
  if (item.synonyms?.length > 0) score += 3; else missing.push('synonyms');
  if (item.hints?.length >= 2) score += 7; else {
    if (item.hints?.length === 1) { score += 3; issues.push('Chỉ có 1 gợi nhớ, nên có ≥2'); }
    else missing.push('hints');
  }

  return { word: item.word, score, missing, issues };
}

export function validateDataset(): {
  total: number;
  avgScore: number;
  perfect: number;
  byLevel: Record<string, { count: number; avgScore: number }>;
  issues: LangWordValidation[];
} {
  const allWords = LANG_GOLD_DATASET.flatMap(s => s.words.map(w => ({ ...w, level: s.level })));
  const validations = allWords.map(w => ({ ...validateWord(w), level: (w as any).level as string }));

  const perfect = validations.filter(v => v.score === 100).length;
  const avgScore = Math.round(validations.reduce((s, v) => s + v.score, 0) / validations.length);

  const byLevel: Record<string, { count: number; avgScore: number }> = {};
  for (const v of validations as (LangWordValidation & { level: string })[]) {
    if (!byLevel[v.level]) byLevel[v.level] = { count: 0, avgScore: 0 };
    byLevel[v.level].count++;
    byLevel[v.level].avgScore += v.score;
  }
  for (const lvl of Object.keys(byLevel)) {
    byLevel[lvl].avgScore = Math.round(byLevel[lvl].avgScore / byLevel[lvl].count);
  }

  return { total: allWords.length, avgScore, perfect, byLevel, issues: validations.filter(v => v.score < 100) };
}
