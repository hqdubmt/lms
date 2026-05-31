/**
 * Gold dataset — 20 bài Tiếng Việt chuẩn dùng làm benchmark.
 * Bao gồm: Danh từ, Động từ, Tính từ, Từ đồng nghĩa, Từ trái nghĩa,
 *           Đọc hiểu, Chính tả, Thành ngữ, Tục ngữ — lớp 1-5.
 *
 * Mỗi bài có expectedKnowledge — JSON chuẩn theo tieptiengviet1.md:
 * [{ name, definition (≥30 ký tự), example, hints (≥2 mục) }]
 */

export interface VietGoldKnowledgeItem {
  name: string;
  definition: string;
  example: string;
  hints: string[];
}

export interface VietGoldItem {
  label: string;
  grade: number;
  text: string;
  expectedKnowledge: VietGoldKnowledgeItem[];
}

export const VIET_GOLD_DATASET: VietGoldItem[] = [
  // ─── Lớp 1 ─────────────────────────────────────────────────────────────────
  {
    label: 'L1-01 Danh từ chỉ người',
    grade: 1,
    text: `Bài 1: Danh từ chỉ người

Định nghĩa:
Danh từ chỉ người là những từ dùng để gọi tên con người, bao gồm tên riêng và tên chung.

Ví dụ về danh từ chỉ người:
- bố, mẹ, ông, bà, anh, chị, em — chỉ quan hệ gia đình
- thầy giáo, cô giáo, học sinh — chỉ nghề nghiệp và vai trò
- bạn bè, hàng xóm — chỉ quan hệ xã hội

Bài tập nhận biết:
1. Tìm danh từ chỉ người trong câu: "Bố mẹ đưa em đến trường."
2. Điền danh từ thích hợp: "___ đang giảng bài trên bục."
3. Đặt câu với từ "bà ngoại".

Ghi nhớ: Danh từ chỉ người thường đứng đầu câu làm chủ ngữ hoặc sau động từ làm bổ ngữ. Khi viết tên riêng của người, phải viết hoa chữ cái đầu.`,
    expectedKnowledge: [
      {
        name: 'Danh từ chỉ người',
        definition: 'Những từ dùng để gọi tên con người, bao gồm tên riêng và tên chung như bố, mẹ, thầy giáo, học sinh.',
        example: 'Bố mẹ đưa em đến trường mỗi buổi sáng.',
        hints: ['Thường đứng đầu câu làm chủ ngữ', 'Tên riêng phải viết hoa chữ cái đầu'],
      },
      {
        name: 'Danh từ chỉ quan hệ gia đình',
        definition: 'Từ chỉ mối quan hệ ruột thịt trong gia đình như bố, mẹ, ông, bà, anh, chị, em.',
        example: 'Bà ngoại kể chuyện cổ tích cho em nghe mỗi tối.',
        hints: ['Ví dụ: bố, mẹ, ông, bà, anh, chị, em', 'Dùng để gọi người thân trong gia đình'],
      },
      {
        name: 'Danh từ chỉ nghề nghiệp và vai trò',
        definition: 'Từ chỉ công việc hay vị trí của người trong xã hội như thầy giáo, cô giáo, bác sĩ, học sinh.',
        example: 'Thầy giáo đang giảng bài cho các học sinh trên bục.',
        hints: ['Ví dụ: thầy giáo, bác sĩ, kỹ sư, công nhân', 'Thể hiện vai trò của người trong xã hội'],
      },
    ],
  },
  {
    label: 'L1-02 Chính tả vần an/ang',
    grade: 1,
    text: `Chính tả: Phân biệt vần "an" và "ang"

Quy tắc phân biệt:
Vần "an" và "ang" là hai vần dễ nhầm lẫn trong tiếng Việt. Cần luyện tập phân biệt qua nghe và viết.

Từ có vần "an":
- bàn (bàn ghế) — đồ vật dùng để viết
- con gà mái đang ấp trứng — chăm con
- làn gió mát — cơn gió nhẹ
- đàn chim hót — nhóm chim

Từ có vần "ang":
- cái bàng (cây bàng) — loài cây
- màng nhện — vật mỏng dạng lưới
- trang giấy — mặt giấy phẳng
- hàng cây — dãy cây xếp thành hàng

Bài tập:
1. Điền "an" hoặc "ang": bàn / bàng, làn / làng, đàn / đàng
2. Viết chính tả đoạn văn: "Đàn chim bay trên bầu trời xanh. Gió thổi nhẹ trên hàng cây. Trẻ em vui chơi dưới bóng cây bàng to."
3. Tìm 3 từ có vần "an" và 3 từ có vần "ang" trong đoạn văn trên.`,
    expectedKnowledge: [
      {
        name: 'Vần "an"',
        definition: 'Vần kết thúc bằng âm "an", dùng trong nhiều từ tiếng Việt phổ biến như bàn, đàn, làn.',
        example: 'Đàn chim hót vang trên cây trong vườn nhà.',
        hints: ['Ví dụ từ có vần an: bàn, làn, đàn, gan', 'Phân biệt với vần "ang" bằng cách lắng nghe kỹ âm cuối'],
      },
      {
        name: 'Vần "ang"',
        definition: 'Vần kết thúc bằng âm "ang", thường xuất hiện trong các từ chỉ không gian rộng hoặc sự vật có hình dạng dẹp.',
        example: 'Trẻ em vui chơi dưới bóng cây bàng to trong sân.',
        hints: ['Ví dụ từ có vần ang: bàng, trang, hàng, màng', 'Âm "ang" ngân dài hơn âm "an"'],
      },
      {
        name: 'Cách phân biệt vần an và ang',
        definition: 'Vần "an" kết thúc bằng phụ âm "n" còn vần "ang" kết thúc bằng phụ âm "ng" — ngân dài hơn khi đọc.',
        example: 'Làn gió nhẹ thổi qua hàng cây bàng xanh mướt.',
        hints: ['Đọc to từng từ để cảm nhận sự khác biệt âm cuối', 'Luyện tập qua bài chính tả mỗi ngày'],
      },
    ],
  },

  // ─── Lớp 2 ─────────────────────────────────────────────────────────────────
  {
    label: 'L2-01 Động từ chỉ hoạt động',
    grade: 2,
    text: `Bài 2: Động từ chỉ hoạt động

Định nghĩa:
Động từ là những từ chỉ hoạt động, hành động hoặc trạng thái của người, vật. Động từ thường trả lời cho câu hỏi "làm gì?", "như thế nào?".

Ví dụ về động từ chỉ hoạt động:
- chạy, nhảy, bơi, leo — hoạt động vận động
- ăn, uống, ngủ, nghỉ — hoạt động sinh hoạt
- học, đọc, viết, vẽ — hoạt động học tập
- nói, hát, cười, khóc — hoạt động biểu đạt cảm xúc

Cách dùng động từ trong câu:
Động từ thường đứng sau chủ ngữ: "Bạn Nam đang chạy nhanh trên sân."
Động từ có thể kết hợp với phó từ: "đang học", "sẽ về", "đã ăn".

Bài tập:
1. Gạch dưới động từ trong câu: "Em học bài, mẹ nấu cơm, bố đọc báo."
2. Điền động từ thích hợp: "Chú chó đang ___ dưới gốc cây."
3. Đặt 3 câu dùng động từ: chạy, học, ăn.
4. Kể một hoạt động em làm hằng ngày, dùng ít nhất 5 động từ.`,
    expectedKnowledge: [
      {
        name: 'Động từ',
        definition: 'Từ chỉ hoạt động, hành động hoặc trạng thái của người và vật, trả lời câu hỏi "làm gì?" hoặc "như thế nào?".',
        example: 'Bạn Nam đang chạy nhanh trên sân trường buổi sáng.',
        hints: ['Động từ thường đứng sau chủ ngữ trong câu', 'Kết hợp được với phó từ: đang, đã, sẽ'],
      },
      {
        name: 'Động từ chỉ hoạt động vận động',
        definition: 'Nhóm động từ chỉ chuyển động của cơ thể như chạy, nhảy, bơi, leo, đi, đứng, ngồi.',
        example: 'Các bạn chạy, nhảy và bơi trong giờ thể dục ngoài sân.',
        hints: ['Ví dụ: chạy, nhảy, bơi, leo, đi, đứng', 'Thường dùng khi miêu tả hoạt động thể chất'],
      },
      {
        name: 'Phó từ kết hợp với động từ',
        definition: 'Phó từ đứng trước động từ để chỉ thời gian hành động như "đang" (hiện tại), "đã" (quá khứ), "sẽ" (tương lai).',
        example: 'Em đang học bài, mẹ đã nấu cơm xong, bố sẽ về lúc chiều.',
        hints: ['đang: hành động đang xảy ra', 'đã: hành động đã xảy ra; sẽ: hành động sẽ xảy ra'],
      },
    ],
  },
  {
    label: 'L2-02 Từ đồng nghĩa cơ bản',
    grade: 2,
    text: `Bài 2: Từ đồng nghĩa

Định nghĩa:
Từ đồng nghĩa là những từ có nghĩa giống nhau hoặc gần giống nhau. Dùng từ đồng nghĩa giúp câu văn phong phú và tránh lặp từ.

Các nhóm từ đồng nghĩa thường gặp:
- vui — vui vẻ — vui mừng — phấn khởi — hân hoan (cùng nghĩa chỉ cảm xúc vui)
- buồn — đau lòng — sầu não — ủ rũ (cùng nghĩa chỉ cảm xúc buồn)
- to — lớn — rộng — bao la (cùng nghĩa chỉ kích thước)
- nhỏ — bé — tí hon — nhỏ nhắn (cùng nghĩa chỉ kích thước nhỏ)
- đi — bước — chạy — di chuyển (cùng nghĩa chỉ chuyển động, mức độ khác nhau)

Lưu ý quan trọng:
Từ đồng nghĩa tuy có nghĩa gần nhau nhưng thường khác nhau về sắc thái, mức độ hoặc hoàn cảnh dùng.

Bài tập:
1. Tìm từ đồng nghĩa với từ: nhìn, xem, ngó (cùng chỉ hành động dùng mắt)
2. Thay từ đồng nghĩa trong câu: "Hoa cúc rất đẹp." → Thay "đẹp" bằng từ khác.
3. Đặt câu với hai từ đồng nghĩa để thấy sự khác nhau về sắc thái.`,
    expectedKnowledge: [
      {
        name: 'Từ đồng nghĩa',
        definition: 'Những từ có nghĩa giống nhau hoặc gần giống nhau, dùng thay thế cho nhau nhưng thường khác về sắc thái.',
        example: 'Hoa cúc rất xinh đẹp — có thể thay "đẹp" bằng "xinh", "duyên dáng".',
        hints: ['Giúp câu văn phong phú và tránh lặp từ', 'Dù đồng nghĩa vẫn có thể khác về sắc thái biểu cảm'],
      },
      {
        name: 'Nhóm từ đồng nghĩa chỉ cảm xúc vui',
        definition: 'Nhóm từ cùng diễn đạt trạng thái vui mừng gồm: vui, vui vẻ, vui mừng, phấn khởi, hân hoan.',
        example: 'Em phấn khởi khi được điểm mười; cả nhà hân hoan đón tin vui.',
        hints: ['Vui — trung tính; phấn khởi — tích cực mạnh hơn', 'Hân hoan thường dùng trong văn viết trang trọng'],
      },
      {
        name: 'Nhóm từ đồng nghĩa chỉ kích thước nhỏ',
        definition: 'Nhóm từ cùng chỉ sự vật có kích thước nhỏ gồm: nhỏ, bé, tí hon, nhỏ nhắn, tí tẹo.',
        example: 'Con kiến bé tí xíu tha mồi về tổ mỗi ngày.',
        hints: ['Tí hon: rất nhỏ như trong truyện cổ tích', 'Nhỏ nhắn: nhỏ nhắn xinh xắn (thường tả người)'],
      },
    ],
  },

  // ─── Lớp 3 ─────────────────────────────────────────────────────────────────
  {
    label: 'L3-01 Tính từ chỉ màu sắc',
    grade: 3,
    text: `Bài 3: Tính từ chỉ màu sắc

Định nghĩa:
Tính từ là những từ dùng để miêu tả đặc điểm, tính chất của sự vật, hiện tượng. Tính từ chỉ màu sắc miêu tả màu của người, vật hoặc cảnh vật.

Các tính từ chỉ màu sắc cơ bản:
- đỏ — màu của lửa, máu, hoa hồng, cờ Tổ quốc
- xanh — màu của lá cây, bầu trời, biển cả
- vàng — màu của lúa chín, ánh nắng, hoa cúc
- trắng — màu của tuyết, mây trắng, áo trắng học sinh
- đen — màu của than, đêm tối
- tím — màu của hoa tím, hoàng hôn

Tính từ chỉ màu sắc kết hợp:
- xanh lá cây, xanh da trời, xanh ngọc — các sắc thái của màu xanh
- đỏ tươi, đỏ thẫm, đỏ au — các sắc thái của màu đỏ
- vàng nhạt, vàng rực, vàng ươm — các sắc thái của màu vàng

Bài tập:
1. Tìm tính từ chỉ màu sắc trong đoạn văn: "Bầu trời xanh trong, mây trắng bồng bềnh, ánh nắng vàng rực chiếu xuống cánh đồng lúa chín."
2. Miêu tả bức tranh về mùa thu sử dụng ít nhất 5 tính từ chỉ màu sắc.
3. Điền tính từ chỉ màu sắc phù hợp: "Chiếc lá ___ rơi nhẹ xuống mặt hồ ___ xanh."`,
    expectedKnowledge: [
      {
        name: 'Tính từ chỉ màu sắc',
        definition: 'Những từ dùng để miêu tả màu sắc của sự vật, hiện tượng như đỏ, xanh, vàng, trắng, đen, tím.',
        example: 'Bầu trời xanh trong, mây trắng bồng bềnh, nắng vàng rực rỡ.',
        hints: ['Đứng trước danh từ để bổ sung ý nghĩa màu sắc', 'Có thể kết hợp thêm từ chỉ sắc thái: đỏ tươi, xanh ngọc'],
      },
      {
        name: 'Màu sắc cơ bản trong tiếng Việt',
        definition: 'Sáu màu cơ bản gồm đỏ, xanh, vàng, trắng, đen, tím — mỗi màu gắn với nhiều hình ảnh trong cuộc sống.',
        example: 'Cờ Tổ quốc màu đỏ với ngôi sao vàng năm cánh bay phất phới.',
        hints: ['Đỏ — lửa, máu, cờ; xanh — lá, trời, biển', 'Vàng — nắng, lúa chín; trắng — mây, áo học sinh'],
      },
      {
        name: 'Tính từ màu sắc kết hợp chỉ sắc thái',
        definition: 'Kết hợp tính từ màu với từ khác để diễn đạt sắc thái cụ thể hơn như xanh lá cây, đỏ tươi, vàng rực.',
        example: 'Chiếc lá vàng ươm rơi nhẹ xuống mặt hồ xanh biếc.',
        hints: ['Xanh có nhiều sắc thái: xanh lá, xanh da trời, xanh ngọc', 'Vàng rực > vàng nhạt (mức độ đậm nhạt khác nhau)'],
      },
    ],
  },
  {
    label: 'L3-02 Đọc hiểu bài Cây tre Việt Nam',
    grade: 3,
    text: `Đọc hiểu: Cây tre Việt Nam

Bài đọc:
Tre là người bạn thân thiết của người Việt Nam từ bao đời nay. Tre mọc khắp nơi trên đất nước ta, từ đồng bằng đến miền núi. Tre cứng cáp, dẻo dai, không sợ bão gió. Dù bão tố có thổi mạnh đến đâu, cây tre vẫn đứng vững.

Người ta dùng tre để làm nhà, làm đồ dùng trong nhà như giường, chiếu, rổ, rá. Măng tre là món ăn ngon và bổ dưỡng. Tre còn được dùng làm nhạc cụ như đàn tre, sáo trúc tạo nên những âm thanh trong trẻo, ngân vang.

Trong kháng chiến, tre còn là vũ khí đánh giặc. Những chiếc cọc tre nhọn hoắt cắm xuống lòng sông để cản thuyền giặc. Tre mang trong mình phẩm chất kiên cường, bất khuất của người Việt.

Ngày nay, tre vẫn hiện diện trong cuộc sống hiện đại. Sản phẩm từ tre ngày càng được ưa chuộng vì thân thiện với môi trường và bền đẹp.

Câu hỏi đọc hiểu:
1. Tre mọc ở đâu trên đất nước Việt Nam?
2. Tre có những đặc điểm gì nổi bật?
3. Người ta dùng tre để làm những gì?
4. Trong kháng chiến, tre có vai trò như thế nào?
5. Tại sao tre được coi là biểu tượng của phẩm chất người Việt?
6. Em hãy nêu ý nghĩa của câu "Tre cứng cáp, dẻo dai, không sợ bão gió."`,
    expectedKnowledge: [
      {
        name: 'Đặc điểm của cây tre',
        definition: 'Tre cứng cáp, dẻo dai, mọc khắp nơi từ đồng bằng đến miền núi, không sợ bão gió và đứng vững trong mọi hoàn cảnh.',
        example: 'Dù bão tố có thổi mạnh đến đâu, cây tre vẫn đứng vững không ngã.',
        hints: ['Cứng cáp: chắc chắn, không dễ gãy', 'Dẻo dai: uốn cong được nhưng không đứt gãy'],
      },
      {
        name: 'Công dụng của cây tre',
        definition: 'Tre được dùng làm nhà, đồ dùng gia đình (giường, chiếu, rổ, rá), nhạc cụ (sáo trúc), thức ăn (măng tre) và vũ khí.',
        example: 'Măng tre là món ăn ngon bổ dưỡng, sáo trúc tạo ra âm thanh trong trẻo ngân vang.',
        hints: ['Tre dùng trong đời sống: nhà ở, đồ dùng, thức ăn', 'Tre dùng trong chiến đấu: cọc tre cắm lòng sông cản thuyền giặc'],
      },
      {
        name: 'Biểu tượng phẩm chất người Việt',
        definition: 'Tre tượng trưng cho tính kiên cường, bất khuất, dẻo dai của người Việt — gắn bó với dân tộc từ ngàn đời.',
        example: 'Tre mang trong mình phẩm chất kiên cường, bất khuất như người Việt Nam trong kháng chiến.',
        hints: ['Kiên cường: mạnh mẽ không chịu khuất phục', 'Bất khuất: không chịu cúi đầu trước kẻ thù'],
      },
    ],
  },
  {
    label: 'L3-03 Ngữ pháp câu đơn',
    grade: 3,
    text: `Ngữ pháp: Câu đơn — Chủ ngữ và Vị ngữ

Định nghĩa câu đơn:
Câu đơn là câu chỉ có một cụm chủ ngữ — vị ngữ. Câu đơn diễn đạt một ý hoàn chỉnh.

Thành phần câu đơn:
1. Chủ ngữ (CN): Chỉ người, vật, sự việc được nói đến. Trả lời câu hỏi "Ai?", "Cái gì?", "Con gì?"
   Ví dụ: "Bạn Lan" trong câu "Bạn Lan đang học bài."

2. Vị ngữ (VN): Chỉ hoạt động, trạng thái, đặc điểm của chủ ngữ. Trả lời câu hỏi "Làm gì?", "Như thế nào?", "Là gì?"
   Ví dụ: "đang học bài" trong câu "Bạn Lan đang học bài."

Cách xác định chủ ngữ và vị ngữ:
- Đặt câu hỏi "Ai? Cái gì?" → tìm chủ ngữ
- Đặt câu hỏi "Làm gì? Như thế nào?" → tìm vị ngữ

Bài tập:
1. Xác định chủ ngữ và vị ngữ: "Con mèo nằm ngủ trên ghế."
2. Xác định chủ ngữ và vị ngữ: "Mùa xuân về mang theo hoa và sắc màu tươi đẹp."
3. Đặt câu với chủ ngữ "Đàn bướm" — vị ngữ tự chọn.
4. Viết 3 câu đơn miêu tả một buổi sáng đẹp trời, gạch dưới chủ ngữ và vị ngữ.`,
    expectedKnowledge: [
      {
        name: 'Câu đơn',
        definition: 'Câu chỉ có một cụm chủ ngữ — vị ngữ, diễn đạt một ý hoàn chỉnh, gồm hai thành phần chính.',
        example: 'Con mèo nằm ngủ trên ghế — đây là câu đơn có chủ ngữ "con mèo" và vị ngữ "nằm ngủ trên ghế".',
        hints: ['Câu đơn = một chủ ngữ + một vị ngữ', 'Diễn đạt đủ ý, có thể đứng độc lập'],
      },
      {
        name: 'Chủ ngữ',
        definition: 'Thành phần câu chỉ người, vật hoặc sự việc được nói đến, trả lời câu hỏi "Ai?", "Cái gì?", "Con gì?".',
        example: 'Bạn Lan đang học bài — chủ ngữ là "Bạn Lan" (Ai đang học bài? — Bạn Lan).',
        hints: ['Hỏi "Ai?" hoặc "Cái gì?" để tìm chủ ngữ', 'Thường là danh từ hoặc đại từ đứng đầu câu'],
      },
      {
        name: 'Vị ngữ',
        definition: 'Thành phần câu chỉ hoạt động, trạng thái hoặc đặc điểm của chủ ngữ, trả lời câu hỏi "Làm gì?" hay "Như thế nào?".',
        example: 'Bạn Lan đang học bài — vị ngữ là "đang học bài" (Bạn Lan làm gì? — đang học bài).',
        hints: ['Hỏi "Làm gì?" hoặc "Như thế nào?" để tìm vị ngữ', 'Thường là động từ hoặc cụm động từ'],
      },
    ],
  },

  // ─── Lớp 4 ─────────────────────────────────────────────────────────────────
  {
    label: 'L4-01 Từ trái nghĩa',
    grade: 4,
    text: `Bài 4: Từ trái nghĩa

Định nghĩa:
Từ trái nghĩa là những từ có nghĩa đối lập nhau. Dùng từ trái nghĩa giúp câu văn sinh động, nổi bật và thể hiện rõ sự tương phản.

Các cặp từ trái nghĩa phổ biến:
- cao — thấp: "Người cao" đối lập với "người thấp"
- nhanh — chậm: "chạy nhanh" đối lập với "bước chậm"
- sáng — tối: "ban ngày sáng" đối lập với "đêm tối"
- nóng — lạnh: "mùa hè nóng bức" đối lập với "mùa đông lạnh giá"
- vui — buồn: "niềm vui" đối lập với "nỗi buồn"
- được — mất: "được lợi" đối lập với "mất mát"
- yêu — ghét: "yêu thương" đối lập với "căm ghét"

Từ trái nghĩa trong thành ngữ và tục ngữ:
- "Gần mực thì đen, gần đèn thì sáng" — đen/sáng là từ trái nghĩa
- "Tốt gỗ hơn tốt nước sơn" — tốt gỗ / tốt nước sơn

Tác dụng của từ trái nghĩa trong văn học:
Từ trái nghĩa tạo ra sự tương phản, nhấn mạnh ý nghĩa, khiến câu thơ, câu văn trở nên ấn tượng và gợi cảm hơn.

Bài tập:
1. Tìm từ trái nghĩa với: đẹp, khỏe, giàu, thật, trắng
2. Điền từ trái nghĩa: "Trời ___ thì cây cối tươi tốt, trời ___ thì cây cối héo tàn."
3. Tìm từ trái nghĩa trong câu tục ngữ: "Có mới nới cũ."
4. Viết đoạn văn ngắn sử dụng ít nhất 3 cặp từ trái nghĩa.`,
    expectedKnowledge: [
      {
        name: 'Từ trái nghĩa',
        definition: 'Những từ có nghĩa đối lập nhau hoàn toàn, khi dùng cùng nhau tạo ra sự tương phản rõ nét trong câu.',
        example: 'Gần mực thì đen, gần đèn thì sáng — đen/sáng là cặp từ trái nghĩa điển hình.',
        hints: ['Tạo sự tương phản, làm câu thêm sinh động', 'Ví dụ: cao/thấp, nóng/lạnh, vui/buồn, được/mất'],
      },
      {
        name: 'Cặp từ trái nghĩa phổ biến',
        definition: 'Các cặp từ có nghĩa đối lập thường gặp như cao/thấp, nhanh/chậm, sáng/tối, nóng/lạnh, yêu/ghét.',
        example: 'Mùa hè nóng bức đối lập với mùa đông lạnh giá — nóng và lạnh là từ trái nghĩa.',
        hints: ['Thường thuộc cùng một phạm trù ngữ nghĩa (nhiệt độ, kích thước, cảm xúc)', 'Có thể có nhiều từ trái nghĩa với một từ tùy ngữ cảnh'],
      },
      {
        name: 'Tác dụng từ trái nghĩa trong văn học',
        definition: 'Từ trái nghĩa tạo sự tương phản mạnh, nhấn mạnh ý nghĩa và làm cho câu thơ, câu văn ấn tượng và giàu biểu cảm hơn.',
        example: 'Câu tục ngữ "Có mới nới cũ" dùng mới/cũ để phê phán thói vong ân bội nghĩa.',
        hints: ['Dùng trong tục ngữ, thành ngữ để tạo đối xứng', 'Làm nổi bật sự khác biệt giữa hai đặc điểm'],
      },
    ],
  },
  {
    label: 'L4-02 Thành ngữ quen dùng',
    grade: 4,
    text: `Bài 4: Thành ngữ — Nghĩa đen và nghĩa bóng

Định nghĩa:
Thành ngữ là những cụm từ cố định có nghĩa hoàn chỉnh, thường mang nghĩa bóng — nghĩa khác với nghĩa đen của từng từ riêng lẻ. Thành ngữ làm cho lời nói ngắn gọn, hàm súc và sinh động.

Các thành ngữ phổ biến:
1. "Vắt cổ chày ra nước" — nghĩa bóng: người rất keo kiệt, bủn xỉn, không chịu cho ai điều gì dù nhỏ
2. "Nước đổ đầu vịt" — nghĩa bóng: khuyên bảo mãi nhưng người nghe vẫn không tiếp thu, không thay đổi
3. "Bọ hung ngủ quên" — nghĩa bóng: người quá bận hoặc ngủ nhiều đến mức quên mất việc quan trọng
4. "Miệng nam mô lòng dao kiếm" — nghĩa bóng: người ngoài miệng thì hiền lành, tốt bụng nhưng lòng dạ lại độc ác, thâm hiểm
5. "Chân cứng đá mềm" — nghĩa bóng: vượt qua mọi khó khăn gian khổ, kiên cường không nản lòng
6. "Học một biết mười" — nghĩa bóng: người thông minh, học ít mà hiểu được nhiều

Cách sử dụng thành ngữ:
- Thành ngữ thường dùng trong văn nói và văn viết để tăng tính biểu đạt.
- Cần hiểu đúng nghĩa bóng mới dùng thành ngữ cho phù hợp.

Bài tập:
1. Giải thích nghĩa của thành ngữ: "Có công mài sắt có ngày nên kim"
2. Dùng thành ngữ "chân cứng đá mềm" đặt một câu có nghĩa.
3. Tìm thêm 2 thành ngữ nói về tính kiên nhẫn và giải thích nghĩa.`,
    expectedKnowledge: [
      {
        name: 'Thành ngữ',
        definition: 'Cụm từ cố định mang nghĩa bóng — nghĩa khác với nghĩa đen, giúp lời nói ngắn gọn, hàm súc và sinh động hơn.',
        example: '"Chân cứng đá mềm" nghĩa bóng: kiên cường vượt qua mọi khó khăn không nản lòng.',
        hints: ['Nghĩa bóng quan trọng hơn nghĩa đen của từng từ', 'Không thể thay thế từ trong thành ngữ — cụm từ cố định'],
      },
      {
        name: 'Nghĩa đen và nghĩa bóng của thành ngữ',
        definition: 'Nghĩa đen là nghĩa thực của từng từ riêng lẻ; nghĩa bóng là nghĩa ẩn dụ của cả cụm từ thành ngữ.',
        example: '"Nước đổ đầu vịt" — đen: đổ nước lên đầu vịt; bóng: khuyên bảo mãi mà người ta không nghe.',
        hints: ['Hiểu nghĩa bóng mới dùng thành ngữ đúng chỗ', 'Dấu hiệu nhận biết: cụm từ quen thuộc, không hiểu nghĩa đen theo nghĩa thông thường'],
      },
      {
        name: 'Thành ngữ chỉ sự kiên nhẫn',
        definition: 'Nhóm thành ngữ khuyến khích tính kiên trì, bền bỉ như "Học một biết mười", "Chân cứng đá mềm".',
        example: '"Học một biết mười" nghĩa bóng: học ít nhưng thông minh suy ra được nhiều điều từ kiến thức đã học.',
        hints: ['Chân cứng đá mềm: kiên cường vượt mọi khó khăn', 'Học một biết mười: thông minh, hiểu rộng từ ít dữ liệu'],
      },
    ],
  },
  {
    label: 'L4-03 Đọc hiểu Thư gửi các học sinh',
    grade: 4,
    text: `Đọc hiểu: Đoạn trích "Thư gửi các học sinh" — Hồ Chí Minh

Bài đọc:
Các em học sinh,

Hôm nay là ngày khai trường đầu tiên của nước Việt Nam Dân chủ Cộng hòa. Tôi đã tưởng tượng thấy trước mắt cái cảnh nhộn nhịp tưng bừng của ngày tựu trường ở khắp các nơi.

Các em được hưởng sự may mắn đó là nhờ sự hi sinh của biết bao đồng bào các em. Vậy các em nghĩ sao?

Trong năm học tới đây, các em hãy cố gắng siêng năng học tập, ngoan ngoãn, nghe thầy, yêu bạn. Sau 80 năm giời nô lệ làm cho nước nhà bị yếu hèn, ngày nay chúng ta cần phải xây dựng lại cơ đồ mà tổ tiên đã để lại cho chúng ta, làm sao cho chúng ta theo kịp các nước khác trên hoàn cầu.

Trong công cuộc kiến thiết đó, nước nhà trông mong chờ đợi ở các em rất nhiều. Non sông Việt Nam có trở nên tươi đẹp hay không, dân tộc Việt Nam có bước tới đài vinh quang để sánh vai với các cường quốc năm châu được hay không, chính là nhờ một phần lớn ở công học tập của các em.

Câu hỏi đọc hiểu:
1. Bức thư được viết vào dịp nào đặc biệt?
2. Bác Hồ mong muốn các học sinh làm gì trong năm học?
3. Theo Bác Hồ, vì sao đất nước cần phải xây dựng lại cơ đồ?
4. Câu nào trong bức thư nói lên kỳ vọng của Bác Hồ đối với thế hệ trẻ?
5. Em rút ra bài học gì từ bức thư này?`,
    expectedKnowledge: [
      {
        name: 'Hoàn cảnh bức thư',
        definition: 'Bức thư được Bác Hồ viết vào ngày khai trường đầu tiên của nước Việt Nam Dân chủ Cộng hòa sau khi giành độc lập.',
        example: '"Hôm nay là ngày khai trường đầu tiên của nước Việt Nam Dân chủ Cộng hòa."',
        hints: ['Viết vào năm 1945, sau Cách mạng tháng Tám thành công', 'Đây là ngày khai giảng lịch sử của đất nước độc lập'],
      },
      {
        name: 'Kỳ vọng của Bác Hồ với học sinh',
        definition: 'Bác Hồ mong học sinh siêng năng học tập, ngoan ngoãn, nghe thầy, yêu bạn và góp phần xây dựng đất nước giàu mạnh.',
        example: '"Non sông Việt Nam có trở nên tươi đẹp hay không... chính là nhờ một phần lớn ở công học tập của các em."',
        hints: ['Học sinh là tương lai của đất nước', 'Học tập tốt chính là yêu nước, xây dựng cơ đồ'],
      },
      {
        name: 'Ý nghĩa bức thư với thế hệ trẻ',
        definition: 'Bức thư khẳng định trách nhiệm lịch sử của học sinh trong việc xây dựng đất nước sau 80 năm nô lệ, sánh vai cường quốc.',
        example: '"Dân tộc Việt Nam có bước tới đài vinh quang để sánh vai với các cường quốc năm châu được hay không."',
        hints: ['Trách nhiệm học tập gắn với vận mệnh quốc gia', 'Mỗi học sinh góp phần vào tương lai tươi sáng của đất nước'],
      },
    ],
  },

  // ─── Lớp 5 ─────────────────────────────────────────────────────────────────
  {
    label: 'L5-01 Danh từ trừu tượng',
    grade: 5,
    text: `Bài 5: Danh từ trừu tượng và danh từ cụ thể

Định nghĩa:
Danh từ cụ thể là danh từ chỉ những sự vật, người, con vật mà ta có thể nhìn thấy, sờ thấy được.
Danh từ trừu tượng là danh từ chỉ những khái niệm, tình cảm, trạng thái mà ta không thể nhìn thấy hay sờ thấy trực tiếp.

Ví dụ về danh từ cụ thể:
- cây xoài, ngôi nhà, bàn học, quyển sách — có thể nhìn thấy
- giọng nói, mùi hương, âm thanh — cảm nhận được bằng giác quan

Ví dụ về danh từ trừu tượng:
- tình yêu, tình bạn, tình nghĩa — chỉ tình cảm
- hòa bình, tự do, bình đẳng — chỉ khái niệm xã hội
- trí tuệ, dũng cảm, sáng tạo — chỉ phẩm chất con người
- niềm vui, nỗi buồn, sự hy vọng — chỉ trạng thái tâm hồn

Cách phân biệt:
Hỏi "Có thể nhìn thấy/sờ thấy không?" nếu không → danh từ trừu tượng.

Bài tập:
1. Phân loại: tình bạn, cái bút, lòng tốt, quyển sách, sự dũng cảm, hòa bình, cây dừa
2. Tìm danh từ trừu tượng trong câu: "Tình yêu quê hương là nguồn sức mạnh vô tận của mỗi người Việt Nam."
3. Đặt 2 câu có danh từ cụ thể và 2 câu có danh từ trừu tượng.`,
    expectedKnowledge: [
      {
        name: 'Danh từ cụ thể',
        definition: 'Danh từ chỉ những sự vật, người, con vật mà ta có thể nhìn thấy, sờ thấy hoặc cảm nhận trực tiếp bằng giác quan.',
        example: 'Cây xoài, quyển sách, bàn học, ngôi nhà là những danh từ cụ thể ta nhìn thấy được.',
        hints: ['Hỏi "Có nhìn thấy/sờ thấy được không?" — nếu có → danh từ cụ thể', 'Ví dụ: bàn ghế, con mèo, giọng nói, mùi hương'],
      },
      {
        name: 'Danh từ trừu tượng',
        definition: 'Danh từ chỉ những khái niệm, tình cảm, trạng thái mà ta không thể nhìn thấy hay sờ thấy trực tiếp như tình yêu, hòa bình.',
        example: 'Tình yêu quê hương là nguồn sức mạnh vô tận của mỗi người Việt Nam.',
        hints: ['Không thể nhìn thấy hay sờ thấy → danh từ trừu tượng', 'Ví dụ: tình bạn, tự do, dũng cảm, niềm vui, hy vọng'],
      },
      {
        name: 'Cách phân biệt danh từ cụ thể và trừu tượng',
        definition: 'Hỏi "Có thể nhìn thấy hoặc sờ thấy không?": có → cụ thể; không → trừu tượng. Danh từ trừu tượng thường chỉ khái niệm, tình cảm, phẩm chất.',
        example: 'Sự dũng cảm (trừu tượng) và cái bút (cụ thể) — dũng cảm không nhìn thấy được, cái bút thì có.',
        hints: ['Phẩm chất (dũng cảm, trí tuệ) và tình cảm (tình bạn) → trừu tượng', 'Đồ vật, người, con vật quan sát được → cụ thể'],
      },
    ],
  },
  {
    label: 'L5-02 Động từ trạng thái',
    grade: 5,
    text: `Bài 5: Động từ — Phân loại theo ý nghĩa

Định nghĩa:
Động từ có thể chia thành nhiều loại theo ý nghĩa: động từ hành động, động từ trạng thái, động từ quan hệ.

Động từ hành động:
Chỉ hành động cụ thể mà người hoặc vật thực hiện, có thể quan sát được.
Ví dụ: chạy, nhảy, viết, vẽ, xây dựng, phá hủy, di chuyển

Động từ trạng thái:
Chỉ trạng thái tồn tại, cảm xúc, nhận thức của chủ thể. Không biểu hiện hành động cụ thể.
Ví dụ: yêu, ghét, thích, sợ, biết, hiểu, nhớ, quên, có, tồn tại, ở

Động từ quan hệ (từ nối):
Dùng để nối chủ ngữ với đặc điểm hoặc danh hiệu của nó.
Ví dụ: là, trở thành, được gọi là, có nghĩa là

Đặc điểm phân biệt:
- Động từ hành động thường kết hợp được với "đang", "đã", "sẽ"
- Động từ trạng thái thường không kết hợp với "đang" (không nói "đang yêu" theo nghĩa trạng thái bền vững)

Bài tập:
1. Phân loại động từ: yêu thương, học tập, trở nên, sợ hãi, bơi lội, hiểu, là, xây nhà
2. Tìm động từ trong đoạn văn và cho biết loại: "Lan rất yêu mẹ. Mỗi ngày, Lan học bài chăm chỉ và giúp mẹ nấu cơm."
3. Đặt câu với mỗi loại động từ: hành động, trạng thái, quan hệ.`,
    expectedKnowledge: [
      {
        name: 'Động từ hành động',
        definition: 'Loại động từ chỉ hành động cụ thể có thể quan sát được như chạy, nhảy, viết, vẽ, xây dựng, kết hợp được với "đang, đã, sẽ".',
        example: 'Lan đang học bài chăm chỉ và giúp mẹ nấu cơm mỗi chiều.',
        hints: ['Có thể quan sát trực tiếp hành động', 'Kết hợp được với phó từ thời gian: đang, đã, sẽ'],
      },
      {
        name: 'Động từ trạng thái',
        definition: 'Loại động từ chỉ trạng thái cảm xúc, nhận thức hoặc tồn tại như yêu, ghét, biết, hiểu, nhớ — không thể quan sát trực tiếp.',
        example: 'Lan rất yêu mẹ và luôn nhớ lời mẹ dặn dù đi xa.',
        hints: ['Không quan sát được bằng mắt (cảm xúc, nhận thức)', 'Thường không dùng với "đang" theo nghĩa trạng thái bền vững'],
      },
      {
        name: 'Động từ quan hệ',
        definition: 'Loại động từ dùng để nối chủ ngữ với đặc điểm hoặc danh hiệu, thường là: là, trở thành, được gọi là, có nghĩa là.',
        example: 'Lan trở thành học sinh giỏi sau một năm cố gắng học tập.',
        hints: ['Ví dụ: là, trở thành, được gọi là', 'Không chỉ hành động hay trạng thái, mà chỉ mối quan hệ'],
      },
    ],
  },
  {
    label: 'L5-03 Tính từ mức độ',
    grade: 5,
    text: `Bài 5: Tính từ — Mức độ và sắc thái

Định nghĩa:
Tính từ có thể biểu thị nhiều mức độ khác nhau của đặc điểm, tính chất. Mức độ của tính từ được thể hiện qua:
1. Tính từ đơn giản: đẹp, xấu, cao, thấp, nóng, lạnh
2. Từ chỉ mức độ kết hợp: rất đẹp, khá cao, hơi lạnh, cực kỳ nóng
3. Từ láy tính từ: đỏ đắn, xanh xanh, nhỏ nhỏ, trắng tinh, đen kịt

Mức độ tăng dần của tính từ:
hơi < khá < rất < cực kỳ < vô cùng < tuyệt vời

Ví dụ:
- "hơi mệt" → ít mệt hơn "rất mệt"
- "khá thông minh" → thông minh ở mức trung bình cao
- "cực kỳ xuất sắc" → xuất sắc ở mức cao nhất

Tính từ chỉ sắc thái trong văn học:
- trắng ngần, trắng tinh, trắng muốt, trắng phau — các sắc thái của màu trắng
- đen kịt, đen tuyền, đen bóng — các sắc thái của màu đen
- xanh biếc, xanh mướt, xanh ngắt — các sắc thái của màu xanh

Bài tập:
1. Sắp xếp theo mức độ tăng dần: rất đẹp, khá đẹp, đẹp tuyệt vời, hơi đẹp, đẹp vô cùng
2. Thay từ chỉ mức độ: "Bầu trời ___ xanh." (điền phù hợp với ngữ cảnh)
3. Tìm tính từ chỉ mức độ trong đoạn thơ: "Làng tôi xanh mướt bóng tre, Sông quê trong vắt, núi hề chất cao."`,
    expectedKnowledge: [
      {
        name: 'Mức độ của tính từ',
        definition: 'Tính từ có thể biểu thị nhiều mức độ qua từ chỉ mức độ kết hợp: hơi < khá < rất < cực kỳ < vô cùng.',
        example: 'Hơi mệt → khá mệt → rất mệt → cực kỳ mệt: mức độ mệt tăng dần theo thứ tự.',
        hints: ['Sắp xếp mức độ tăng dần: hơi, khá, rất, cực kỳ, vô cùng', 'Chọn từ chỉ mức độ phù hợp với ngữ cảnh'],
      },
      {
        name: 'Từ chỉ mức độ kết hợp với tính từ',
        definition: 'Từ đứng trước tính từ để tăng giảm mức độ như hơi, khá, rất, cực kỳ, vô cùng, làm cho ý nghĩa rõ ràng và cụ thể hơn.',
        example: 'Bầu trời rất xanh và trong vắt sau cơn mưa mùa hạ.',
        hints: ['Hơi: mức độ nhẹ, khá: trung bình, rất: cao', 'Cực kỳ, vô cùng: mức độ rất cao, dùng để nhấn mạnh'],
      },
      {
        name: 'Tính từ láy chỉ sắc thái màu sắc',
        definition: 'Tính từ kết hợp để diễn đạt sắc thái màu sắc cụ thể như trắng tinh, đen kịt, xanh biếc, xanh mướt.',
        example: 'Làng tôi xanh mướt bóng tre, sông quê trong vắt chảy qua ruộng đồng.',
        hints: ['Xanh mướt: xanh tươi mát mắt như lá cây', 'Trắng tinh: trắng sạch hoàn toàn; đen kịt: đen rất đậm'],
      },
    ],
  },
  {
    label: 'L5-04 Từ đồng nghĩa trong văn học',
    grade: 5,
    text: `Bài 5: Từ đồng nghĩa — Sắc thái và cách dùng

Định nghĩa nâng cao:
Từ đồng nghĩa là những từ có nghĩa giống nhau hoặc gần giống nhau. Tuy nhiên, từ đồng nghĩa thường khác nhau về:
- Sắc thái biểu cảm (trung tính, trang trọng, thân mật, tiêu cực)
- Phạm vi sử dụng (văn viết, văn nói, địa phương)
- Mức độ (nhẹ, vừa, mạnh)

Ví dụ phân tích sắc thái:
Nhóm từ nghĩa "đi":
- đi — trung tính, dùng phổ biến trong mọi hoàn cảnh
- bước — nhẹ nhàng, thong thả, thường mang sắc thái thơ mộng
- đi bộ — cụ thể, nhấn mạnh phương tiện di chuyển
- tản bộ — thong thả, thoải mái, mang sắc thái nhàn nhã

Nhóm từ nghĩa "nhìn":
- nhìn — trung tính
- ngắm — kỹ lưỡng, trầm trồ thán phục vẻ đẹp
- ngó — thoáng qua, không chú ý nhiều
- nhìn chằm chằm — nhìn mãi không rời, có ý tò mò hoặc thô lỗ

Ứng dụng trong sáng tác văn học:
Chọn từ đồng nghĩa phù hợp sắc thái giúp bài văn sinh động và biểu đạt chính xác cảm xúc.

Bài tập:
1. Phân tích sắc thái: chết, qua đời, mất, hi sinh, từ trần — từ nào trang trọng nhất, bi thương nhất?
2. Chọn từ đồng nghĩa phù hợp: "Bà nội ___ (nhìn/ngắm/ngó) đứa cháu đang vui đùa với vẻ mặt yêu thương."
3. Viết đoạn văn ngắn về mùa xuân, thay thế từ "đẹp" bằng ít nhất 3 từ đồng nghĩa.`,
    expectedKnowledge: [
      {
        name: 'Sắc thái biểu cảm của từ đồng nghĩa',
        definition: 'Từ đồng nghĩa khác nhau về sắc thái biểu cảm: trung tính, trang trọng, thân mật hay tiêu cực — ảnh hưởng đến hiệu quả biểu đạt.',
        example: '"Bà nội ngắm đứa cháu vui đùa" — ngắm thể hiện tình cảm trìu mến hơn "nhìn" hay "ngó".',
        hints: ['Chọn từ phù hợp sắc thái giúp bài văn sống động hơn', 'Trang trọng: từ trần, qua đời; thân mật: mất, chết'],
      },
      {
        name: 'Nhóm từ đồng nghĩa chỉ hành động nhìn',
        definition: 'Các từ cùng nghĩa hành động dùng mắt quan sát: nhìn (trung tính), ngắm (trầm trồ), ngó (thoáng qua), nhìn chằm chằm (tập trung).',
        example: 'Bà nội ngắm đứa cháu vui đùa dưới nắng với nụ cười hiền từ.',
        hints: ['Nhìn — trung tính, dùng mọi hoàn cảnh', 'Ngắm — kỹ lưỡng, thán phục; ngó — liếc nhanh, không chú ý'],
      },
      {
        name: 'Ứng dụng từ đồng nghĩa trong sáng tác',
        definition: 'Chọn đúng từ đồng nghĩa phù hợp sắc thái và ngữ cảnh giúp bài văn tránh lặp từ và biểu đạt cảm xúc chính xác hơn.',
        example: 'Mùa xuân tươi đẹp, rực rỡ, xinh tươi — ba từ đồng nghĩa làm đoạn văn phong phú hơn.',
        hints: ['Tránh lặp từ bằng cách dùng từ đồng nghĩa luân phiên', 'Chọn từ phù hợp văn phong: văn nói hay văn viết'],
      },
    ],
  },
  {
    label: 'L5-05 Tục ngữ về lao động',
    grade: 5,
    text: `Bài 5: Tục ngữ về lao động và sự kiên nhẫn

Định nghĩa tục ngữ:
Tục ngữ là những câu nói ngắn gọn, có vần điệu, đúc kết kinh nghiệm sống, đạo lý của nhân dân ta qua nhiều thế hệ. Tục ngữ thường mang nghĩa bóng, có giá trị giáo dục sâu sắc.

Các tục ngữ về lao động và kiên nhẫn:

1. "Có công mài sắt có ngày nên kim"
   Nghĩa bóng: Kiên trì, bền bỉ, nỗ lực không ngừng sẽ đạt được thành công dù công việc khó khăn đến đâu.

2. "Tay làm hàm nhai, tay quai miệng trễ"
   Nghĩa bóng: Chăm chỉ lao động mới có ăn; lười biếng sẽ đói khổ.

3. "Nhất nghệ tinh, nhất thân vinh"
   Nghĩa bóng: Giỏi một nghề thì sẽ sống tốt; học một nghề đến nơi đến chốn sẽ được trọng dụng.

4. "Không có việc gì khó, chỉ sợ lòng không bền"
   Nghĩa bóng: Không có khó khăn nào là không vượt qua được, chỉ cần có lòng quyết tâm và kiên nhẫn.

5. "Đi một ngày đàng học một sàng khôn"
   Nghĩa bóng: Đi nhiều nơi, trải nghiệm nhiều sẽ học được nhiều điều bổ ích, mở rộng hiểu biết.

Bài tập:
1. Giải thích nghĩa câu tục ngữ: "Có công mài sắt có ngày nên kim"
2. Câu tục ngữ nào em thích nhất? Vì sao? Lấy ví dụ từ thực tế.
3. Tìm thêm 2 câu tục ngữ về tinh thần học tập.
4. Viết đoạn văn ngắn (5-7 câu) minh họa ý nghĩa của tục ngữ "Nhất nghệ tinh, nhất thân vinh".`,
    expectedKnowledge: [
      {
        name: 'Tục ngữ',
        definition: 'Câu nói ngắn gọn, có vần điệu, đúc kết kinh nghiệm sống và đạo lý nhân dân qua nhiều thế hệ, thường mang nghĩa bóng.',
        example: '"Có công mài sắt có ngày nên kim" — kiên trì bền bỉ sẽ đạt được thành công.',
        hints: ['Ngắn gọn, có vần điệu, dễ nhớ', 'Mang nghĩa bóng, có giá trị giáo dục sâu sắc'],
      },
      {
        name: 'Tục ngữ về sự kiên nhẫn và lao động',
        definition: 'Nhóm tục ngữ khuyên chăm chỉ, kiên trì: "Có công mài sắt có ngày nên kim", "Tay làm hàm nhai, tay quai miệng trễ".',
        example: '"Tay làm hàm nhai, tay quai miệng trễ" — chăm chỉ lao động mới có ăn, lười biếng thì đói khổ.',
        hints: ['Có công mài sắt: kiên trì ắt thành công', 'Tay làm hàm nhai: lao động mới có cơm ăn'],
      },
      {
        name: 'Tục ngữ về học hỏi và trải nghiệm',
        definition: 'Nhóm tục ngữ đề cao việc học qua trải nghiệm: "Đi một ngày đàng học một sàng khôn", "Nhất nghệ tinh, nhất thân vinh".',
        example: '"Đi một ngày đàng học một sàng khôn" — ra ngoài trải nghiệm học được nhiều kiến thức bổ ích.',
        hints: ['Nhất nghệ tinh: giỏi một nghề đến nơi đến chốn sẽ được trọng dụng', 'Đi một ngày đàng: trải nghiệm thực tế dạy nhiều hơn sách vở'],
      },
    ],
  },
  {
    label: 'L5-06 Đọc hiểu thơ Quê hương',
    grade: 5,
    text: `Đọc hiểu: Quê hương — Tế Hanh

Bài thơ:
Làng tôi ở vốn làm nghề chài lưới
Nước bao vây cách biển nửa ngày sông
Khi trời trong, gió nhẹ, sớm mai hồng
Dân trai tráng bơi thuyền đi đánh cá

Chiếc thuyền nhẹ hăng như con tuấn mã
Phăng mái chèo mạnh mẽ vượt trường giang
Cánh buồm giương to như mảnh hồn làng
Rướn thân trắng bao la thâu góp gió

Ngày hôm sau, ồn ào trên bến đỗ
Khắp dân làng tấp nập đón ghe về
Nhờ ơn trời, biển lặng, cá đầy ghe
Những con cá tươi ngon thân bạc trắng

Dân chài lưới làn da ngăm rám nắng
Cả thân hình nồng thở vị xa xăm
Chiếc thuyền im bến mỏi trở về nằm
Nghe chất muối thấm dần trong thớ vỏ

Nay xa cách lòng tôi luôn tưởng nhớ
Màu nước xanh cá bạc chiếc buồm vôi
Thoáng con thuyền rẽ sóng chạy ra khơi
Tôi thấy nhớ cái mùi nồng mặn quá

Câu hỏi đọc hiểu:
1. Bài thơ nói về làng quê ở vùng nào? Dân làng làm nghề gì?
2. Tìm hình ảnh so sánh trong bài thơ và nêu tác dụng.
3. Câu thơ "Cánh buồm giương to như mảnh hồn làng" có ý nghĩa gì?
4. Cảm xúc của tác giả khi xa quê được thể hiện qua những từ ngữ nào?
5. Em cảm nhận gì về vẻ đẹp của làng quê và tình yêu quê hương qua bài thơ này?`,
    expectedKnowledge: [
      {
        name: 'Hình ảnh làng quê trong thơ Tế Hanh',
        definition: 'Làng chài ven biển với nghề đánh cá, hình ảnh dân trai tráng bơi thuyền, thuyền mạnh mẽ ra khơi và cá đầy ghe trở về.',
        example: 'Chiếc thuyền nhẹ hăng như con tuấn mã / Phăng mái chèo mạnh mẽ vượt trường giang.',
        hints: ['Làng ven biển, cách biển nửa ngày sông, nghề chài lưới', 'Hình ảnh sinh động: thuyền như tuấn mã, buồm như mảnh hồn làng'],
      },
      {
        name: 'Hình ảnh so sánh trong bài thơ Quê hương',
        definition: 'Bài thơ dùng hình ảnh so sánh đẹp như "thuyền như tuấn mã" và "buồm như mảnh hồn làng" để tô đẹp cảnh đánh cá và tình yêu quê.',
        example: '"Cánh buồm giương to như mảnh hồn làng" — cánh buồm mang theo linh hồn, khát vọng của cả làng chài.',
        hints: ['Thuyền như tuấn mã: mạnh mẽ, nhanh nhẹn như ngựa phi', 'Buồm như hồn làng: cánh buồm mang theo tâm hồn, bản sắc làng chài'],
      },
      {
        name: 'Cảm xúc nhớ quê của tác giả',
        definition: 'Tác giả xa quê luôn tưởng nhớ màu nước xanh, cá bạc, chiếc buồm vôi và mùi nồng mặn của biển — tình yêu quê hương sâu nặng.',
        example: '"Tôi thấy nhớ cái mùi nồng mặn quá" — nhớ quê không chỉ qua hình ảnh mà cả mùi hương đặc trưng của làng biển.',
        hints: ['Nỗi nhớ quê được gợi lên qua màu sắc, hình ảnh và mùi hương', 'Tưởng nhớ, nhớ — những từ diễn tả tình cảm xúc nhớ thương da diết'],
      },
    ],
  },
  {
    label: 'L5-07 Chính tả phân biệt ch/tr',
    grade: 5,
    text: `Chính tả: Phân biệt "ch" và "tr"

Quy tắc phân biệt:
"ch" và "tr" là hai phụ âm đầu dễ nhầm lẫn, đặc biệt với học sinh miền Nam. Cần ghi nhớ qua từng trường hợp cụ thể.

Từ bắt đầu bằng "ch":
- cha, chú, chị, cháu — từ chỉ quan hệ gia đình
- chạy, chơi, chuẩn, chăm — hoạt động
- chiếc, chén, chai, chăn — đồ vật
- chim, chuột, chó — con vật
- chưa, chẳng, chỉ — phó từ

Từ bắt đầu bằng "tr":
- trời, trăng, trú, tràn — thiên nhiên
- trường, trẻ, trai, trong — địa điểm và con người
- trái, trứng, tre, trà — thực vật và thực phẩm
- trắng, trơn, tròn — tính từ mô tả

Mẹo nhớ:
- "ch" thường đi với vần "a" trong: cha, chà, cha mẹ, chào
- "tr" thường đi với vần "ăng", "ơi": trăng, trời
- Từ Hán Việt thường dùng "tr": trung, trực, trí, trường

Bài tập:
1. Điền "ch" hoặc "tr": _ời _ưa _óng _ửi; _iếc thuyền _ôi _ên sông.
2. Viết chính tả đoạn văn: "Trời sáng sớm, chim chóc hót vang. Trẻ em chạy ra vườn chơi đùa dưới bóng cây. Chú chó con chạy theo, sủa vui vẻ."
3. Tìm 5 từ bắt đầu "ch" và 5 từ bắt đầu "tr" trong bài đọc đã học.`,
    expectedKnowledge: [
      {
        name: 'Phụ âm đầu "ch"',
        definition: 'Phụ âm "ch" xuất hiện trong nhiều từ chỉ quan hệ gia đình (cha, chú, chị), con vật (chim, chó, chuột) và hoạt động (chạy, chơi, chăm).',
        example: 'Trời sáng sớm, chim chóc hót vang và chú chó con chạy ra vườn chơi đùa.',
        hints: ['ch thường đi với vần a: cha, chà, chào', 'Từ chỉ quan hệ gia đình hay dùng ch: cha, chú, chị, cháu'],
      },
      {
        name: 'Phụ âm đầu "tr"',
        definition: 'Phụ âm "tr" xuất hiện trong nhiều từ chỉ thiên nhiên (trời, trăng), địa điểm (trường), thực phẩm (trứng, trà) và tính từ (trắng, tròn).',
        example: 'Trẻ em chạy ra sân trường vui chơi dưới ánh trăng sáng.',
        hints: ['tr hay đi với vần ăng, ơi: trăng, trời', 'Từ Hán Việt thường dùng tr: trung, trực, trí, trường'],
      },
      {
        name: 'Mẹo phân biệt ch và tr',
        definition: 'Mẹo nhớ: ch thường đi với vần "a" (cha, chào), tr đi với vần "ăng, ơi" (trăng, trời); từ Hán Việt về đức tính, học vấn hay dùng tr.',
        example: 'Cha (ch) đưa trẻ (tr) đến trường (tr) học, chú (ch) chim (ch) hót vang trên cành cây.',
        hints: ['Luyện chính tả qua nghe và viết hàng ngày', 'Ghi nhớ từng nhóm từ: cha/chú/chị (ch), trời/trăng/trường (tr)'],
      },
    ],
  },
  {
    label: 'L5-08 Ngữ pháp câu ghép',
    grade: 5,
    text: `Ngữ pháp: Câu ghép và các quan hệ từ

Định nghĩa câu ghép:
Câu ghép là câu có hai vế câu trở lên. Các vế câu trong câu ghép thường được nối với nhau bằng quan hệ từ, thể hiện mối quan hệ về nghĩa giữa các vế.

Các loại câu ghép theo quan hệ nghĩa:

1. Câu ghép quan hệ nguyên nhân — kết quả:
   Quan hệ từ: vì, do, tại, bởi vì, nên, vì vậy
   Ví dụ: "Vì trời mưa to nên chúng em không đi dã ngoại được."

2. Câu ghép quan hệ điều kiện — kết quả:
   Quan hệ từ: nếu, giả sử, hễ... thì
   Ví dụ: "Nếu em học chăm chỉ thì em sẽ đạt điểm cao."

3. Câu ghép quan hệ tương phản:
   Quan hệ từ: tuy nhiên, mặc dù, dù, nhưng
   Ví dụ: "Tuy trời mưa nhưng bạn Nam vẫn đi học đúng giờ."

4. Câu ghép quan hệ bổ sung:
   Quan hệ từ: và, với, cùng, ngoài ra
   Ví dụ: "Mẹ nấu cơm và bố rửa bát."

Bài tập:
1. Xác định quan hệ nghĩa và quan hệ từ trong câu: "Mặc dù bài khó nhưng Lan vẫn làm được."
2. Nối hai vế câu thành câu ghép bằng quan hệ từ phù hợp: "Học sinh chăm học" + "Học sinh đạt kết quả tốt"
3. Viết 3 câu ghép với 3 loại quan hệ khác nhau về chủ đề: học tập.`,
    expectedKnowledge: [
      {
        name: 'Câu ghép',
        definition: 'Câu có hai vế câu trở lên, được nối bằng quan hệ từ, thể hiện mối quan hệ về nghĩa giữa các vế như nguyên nhân, điều kiện, tương phản.',
        example: '"Mẹ nấu cơm và bố rửa bát" — câu ghép bổ sung có hai vế nối bằng quan hệ từ "và".',
        hints: ['Câu ghép ≥ 2 vế câu, nối nhau bằng quan hệ từ', 'Mỗi vế câu có chủ ngữ và vị ngữ riêng'],
      },
      {
        name: 'Câu ghép quan hệ nguyên nhân — kết quả',
        definition: 'Loại câu ghép một vế chỉ nguyên nhân, vế kia chỉ kết quả, nối bằng: vì, do, tại, bởi vì... nên, vì vậy.',
        example: '"Vì trời mưa to nên chúng em không đi dã ngoại được." — vì (nguyên nhân), nên (kết quả).',
        hints: ['Quan hệ từ: vì... nên, do... nên, tại... nên', 'Vế nguyên nhân đứng trước, vế kết quả đứng sau'],
      },
      {
        name: 'Câu ghép quan hệ tương phản',
        definition: 'Loại câu ghép hai vế có nghĩa đối lập nhau, nối bằng: tuy... nhưng, mặc dù... nhưng, dù... vẫn.',
        example: '"Tuy trời mưa nhưng bạn Nam vẫn đi học đúng giờ." — tương phản giữa hoàn cảnh và hành động.',
        hints: ['Quan hệ từ: tuy... nhưng, mặc dù... nhưng, dù... vẫn', 'Hai vế có nghĩa đối lập, tạo sự bất ngờ hoặc nhấn mạnh'],
      },
    ],
  },
  {
    label: 'L5-09 Thành ngữ về trí tuệ',
    grade: 5,
    text: `Bài 5: Thành ngữ về trí tuệ và học vấn

Định nghĩa:
Thành ngữ là cụm từ cố định, thường có nghĩa bóng, phản ánh trí tuệ dân gian tích lũy qua nhiều thế hệ. Thành ngữ về trí tuệ và học vấn khuyến khích tinh thần hiếu học.

Các thành ngữ nổi bật:

1. "Học ăn học nói học gói học mở"
   Nghĩa: Con người cần học mọi thứ trong cuộc sống từ ăn uống đến giao tiếp, học từng kỹ năng nhỏ nhất.

2. "Muốn biết phải hỏi, muốn giỏi phải học"
   Nghĩa: Sự tìm tòi học hỏi chủ động là chìa khóa của tri thức và tài năng.

3. "Luyện mãi thành tài, miệt mài tất giỏi"
   Nghĩa: Luyện tập kiên trì sẽ thành thạo, miệt mài không ngừng sẽ giỏi giang.

4. "Thầy giỏi mới có trò giỏi"
   Nghĩa: Chất lượng người thầy quyết định chất lượng học trò, môi trường học tập quan trọng.

5. "Cần cù bù thông minh"
   Nghĩa: Người không thông minh vẫn có thể thành công nhờ sự chăm chỉ, cần cù.

6. "Biết thì nói biết, không biết thì nói không biết, ấy là biết"
   Nghĩa: Khiêm tốn nhận thức giới hạn của mình là một dạng trí tuệ chân thực.

Bài tập:
1. Giải thích nghĩa thành ngữ: "Học tài thi phận" — ý nói điều gì về sự công nhận tài năng?
2. Em đồng ý hay không đồng ý với thành ngữ "Cần cù bù thông minh"? Vì sao?
3. Viết đoạn văn ngắn (6-8 câu) dùng ít nhất 2 thành ngữ về trí tuệ.`,
    expectedKnowledge: [
      {
        name: 'Thành ngữ về tinh thần hiếu học',
        definition: 'Nhóm thành ngữ khuyến khích học hỏi và trau dồi kiến thức như "Học ăn học nói học gói học mở", "Muốn biết phải hỏi muốn giỏi phải học".',
        example: '"Muốn biết phải hỏi, muốn giỏi phải học" — học hỏi chủ động là chìa khóa của tri thức.',
        hints: ['Học ăn học nói: học từng kỹ năng nhỏ trong cuộc sống', 'Muốn biết phải hỏi: chủ động tìm tòi, đặt câu hỏi'],
      },
      {
        name: 'Thành ngữ về sự cần cù và luyện tập',
        definition: 'Nhóm thành ngữ nhấn mạnh kiên trì luyện tập như "Cần cù bù thông minh", "Luyện mãi thành tài, miệt mài tất giỏi".',
        example: '"Cần cù bù thông minh" — chăm chỉ học tập có thể đạt kết quả tốt hơn người thông minh mà lười biếng.',
        hints: ['Cần cù bù thông minh: nỗ lực bù đắp cho thiếu hụt năng khiếu', 'Luyện mãi thành tài: luyện tập đúng cách và kiên trì ắt thành công'],
      },
      {
        name: 'Thành ngữ về sự khiêm tốn trong học vấn',
        definition: 'Thành ngữ nhấn mạnh đức tính khiêm tốn trong học tập: biết nhận ra giới hạn của mình và tiếp tục học hỏi.',
        example: '"Biết thì nói biết, không biết thì nói không biết, ấy là biết" — khiêm tốn là dạng trí tuệ chân thực.',
        hints: ['Thầy giỏi mới có trò giỏi: môi trường học tập ảnh hưởng đến chất lượng', 'Khiêm tốn nhận ra giới hạn bản thân để tiếp tục học hỏi'],
      },
    ],
  },
  {
    label: 'L5-10 Từ đồng nghĩa và trái nghĩa tổng hợp',
    grade: 5,
    text: `Bài 5: Ôn tập — Từ đồng nghĩa và từ trái nghĩa

Tổng kết kiến thức:
Từ đồng nghĩa là những từ có nghĩa giống hoặc gần giống nhau.
Từ trái nghĩa là những từ có nghĩa đối lập nhau.
Hai loại từ này thường được dùng cùng nhau trong văn học để tạo ra sự phong phú, tương phản và nhấn mạnh.

Bảng hệ thống từ đồng nghĩa — trái nghĩa:

Từ gốc | Từ đồng nghĩa | Từ trái nghĩa
tốt | lành, thiện, tốt lành, tốt đẹp | xấu, tệ, dở, độc ác
mạnh | khỏe, cường, vững chắc, bền bỉ | yếu, ốm, bệnh tật
thông minh | sáng dạ, lanh lợi, nhanh trí | chậm chạp, đần độn, kém thông minh
vui | hạnh phúc, phấn khởi, hân hoan, mừng | buồn, đau khổ, sầu não, ủ rũ
yêu | thương, mến, quý | ghét, căm, thù

Từ đồng nghĩa trong thành ngữ tục ngữ:
- "Cây ngay bóng thẳng" — ngay/thẳng là từ đồng nghĩa
- "Gần mực thì đen, gần đèn thì sáng" — đen/sáng là từ trái nghĩa

Ứng dụng sáng tác:
Sử dụng từ đồng nghĩa giúp tránh lặp từ và làm phong phú ngôn ngữ.
Sử dụng từ trái nghĩa tạo ra tương phản, làm nổi bật đặc điểm của sự vật.

Bài tập ôn tập:
1. Tìm từ đồng nghĩa và trái nghĩa cho: sáng, nhanh, cao, đẹp
2. Viết đoạn văn (5-7 câu) về học tập, sử dụng ít nhất 2 cặp từ đồng nghĩa và 1 cặp từ trái nghĩa.
3. Tìm từ đồng nghĩa và trái nghĩa trong bài thơ "Quê hương" của Tế Hanh.`,
    expectedKnowledge: [
      {
        name: 'Ôn tập từ đồng nghĩa',
        definition: 'Từ đồng nghĩa là từ có nghĩa giống hoặc gần giống nhau, có thể thay thế cho nhau nhưng thường khác về sắc thái biểu cảm.',
        example: 'Tốt — lành — thiện — tốt đẹp: bốn từ đồng nghĩa, có thể thay thế nhau trong nhiều hoàn cảnh.',
        hints: ['Dùng từ đồng nghĩa để tránh lặp từ và làm phong phú ngôn ngữ', 'Chú ý sắc thái: "thiện" trang trọng hơn "tốt" trong văn viết'],
      },
      {
        name: 'Ôn tập từ trái nghĩa',
        definition: 'Từ trái nghĩa là từ có nghĩa đối lập hoàn toàn với từ khác, tạo ra sự tương phản khi dùng cùng nhau trong câu.',
        example: '"Gần mực thì đen, gần đèn thì sáng" — đen/sáng là cặp từ trái nghĩa tạo tương phản ý nghĩa.',
        hints: ['Dùng từ trái nghĩa để tạo tương phản và nhấn mạnh', 'Ví dụ cặp trái nghĩa: tốt/xấu, mạnh/yếu, vui/buồn, yêu/ghét'],
      },
      {
        name: 'Ứng dụng trong sáng tác văn học',
        definition: 'Kết hợp từ đồng nghĩa và trái nghĩa trong văn học giúp tạo sự phong phú ngôn ngữ, tương phản ý nghĩa và làm nổi bật chủ đề bài viết.',
        example: '"Cây ngay bóng thẳng" — ngay/thẳng đồng nghĩa, nhấn mạnh đức tính ngay thẳng của người tốt.',
        hints: ['Đồng nghĩa: tránh lặp từ, làm ngôn ngữ phong phú', 'Trái nghĩa: tạo tương phản, nhấn mạnh đặc điểm đối lập'],
      },
    ],
  },
];
