/**
 * Gold dataset — 50 bài Toán chuẩn dùng làm benchmark.
 * Mỗi lần sửa pipeline, chạy lại batch để so sánh điểm.
 */

export interface GoldItem {
  label: string;
  grade: number;
  text: string;
}

export const MATH_GOLD_DATASET: GoldItem[] = [
  // ─── Lớp 1 ─────────────────────────────────────────────────────────────────
  {
    label: 'L1-01 Cộng không nhớ trong 10',
    grade: 1,
    text: `Bài 1: Cộng không nhớ trong phạm vi 10

Định nghĩa:
Cộng không nhớ là phép cộng mà tổng các chữ số ở từng hàng không vượt quá 9 nên không cần nhớ sang hàng tiếp theo.

Quy tắc thực hiện:
- Đặt tính thẳng cột: hàng đơn vị thẳng hàng đơn vị.
- Cộng từ phải sang trái, bắt đầu từ hàng đơn vị.
- Viết kết quả thẳng cột.

Ví dụ:
3 + 4 = 7
5 + 2 = 7
6 + 3 = 9
1 + 8 = 9

Bài tập:
1. Tính: 2 + 5 = ?
2. Tính: 4 + 3 = ?
3. Tính: 1 + 6 = ?
4. Lan có 3 cái kẹo, mẹ cho thêm 4 cái. Lan có tất cả mấy cái kẹo?
5. Bình có 2 quả táo, bạn cho thêm 5 quả. Bình có bao nhiêu quả táo?`,
  },
  {
    label: 'L1-02 Trừ không nhớ trong 10',
    grade: 1,
    text: `Bài 2: Trừ không nhớ trong phạm vi 10

Định nghĩa:
Phép trừ không nhớ là phép trừ mà số bị trừ ở mỗi hàng không nhỏ hơn số trừ tương ứng, nên không cần mượn từ hàng cao hơn.

Quy tắc:
- Đặt tính thẳng cột.
- Trừ từ phải sang trái, từ hàng đơn vị.
- Lấy chữ số hàng đơn vị của số bị trừ trừ đi chữ số hàng đơn vị của số trừ.

Ví dụ:
8 - 3 = 5
9 - 4 = 5
7 - 2 = 5
10 - 4 = 6

Bài tập:
1. Tính: 9 - 5 = ?
2. Tính: 8 - 6 = ?
3. Tính: 7 - 3 = ?
4. Trong vườn có 8 con chim. 3 con bay đi. Còn lại mấy con chim?
5. Nam có 10 viên bi, cho bạn 4 viên. Nam còn lại bao nhiêu viên bi?`,
  },
  {
    label: 'L1-03 Đọc và viết số đến 10',
    grade: 1,
    text: `Bài 3: Đọc, viết và so sánh số từ 1 đến 10

Khái niệm đọc số:
Số 1 đọc là "một", số 2 đọc là "hai", số 3 đọc là "ba", số 4 đọc là "bốn",
số 5 đọc là "năm", số 6 đọc là "sáu", số 7 đọc là "bảy", số 8 đọc là "tám",
số 9 đọc là "chín", số 10 đọc là "mười".

Khái niệm viết số:
Mỗi số có ký hiệu riêng: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.
Số gồm chữ số hàng đơn vị và chữ số hàng chục.
Số 10 gồm chữ số 1 ở hàng chục và chữ số 0 ở hàng đơn vị.

So sánh số:
Số lớn hơn dùng dấu >. Số nhỏ hơn dùng dấu <. Số bằng nhau dùng dấu =.
Ví dụ: 5 > 3, 2 < 7, 4 = 4.

Bài tập:
1. Điền dấu >, <, = vào ô trống: 4 ○ 6
2. Viết số liền sau của 7.
3. Sắp xếp theo thứ tự tăng dần: 5, 2, 8, 1, 4
4. Số nào lớn hơn: 6 hay 9?`,
  },

  // ─── Lớp 2 ─────────────────────────────────────────────────────────────────
  {
    label: 'L2-01 Cộng có nhớ trong 100',
    grade: 2,
    text: `Bài 1: Cộng có nhớ trong phạm vi 100

Định nghĩa:
Cộng có nhớ là phép cộng mà tổng các chữ số ở hàng đơn vị vượt quá 9, cần nhớ 1 vào hàng chục.

Quy tắc thực hiện:
Bước 1: Đặt tính thẳng cột (hàng đơn vị thẳng hàng đơn vị, hàng chục thẳng hàng chục).
Bước 2: Cộng hàng đơn vị. Nếu tổng >= 10, viết chữ số hàng đơn vị, nhớ 1.
Bước 3: Cộng hàng chục, thêm số nhớ.
Bước 4: Viết kết quả.

Ví dụ:
  38
+ 47
----
  85

Giải thích: 8 + 7 = 15, viết 5 nhớ 1. 3 + 4 + 1 = 8. Kết quả 85.

Bài tập:
1. Đặt tính rồi tính: 47 + 36 = ?
2. Đặt tính rồi tính: 58 + 25 = ?
3. Đặt tính rồi tính: 69 + 17 = ?
4. Trường có 48 học sinh lớp 2A và 35 học sinh lớp 2B. Trường có tất cả bao nhiêu học sinh lớp 2?
5. Bình có 27 nhãn vở, mua thêm 46 nhãn. Bình có tất cả bao nhiêu nhãn vở?`,
  },
  {
    label: 'L2-02 Trừ có nhớ trong 100',
    grade: 2,
    text: `Bài 2: Trừ có nhớ trong phạm vi 100

Định nghĩa:
Trừ có nhớ là phép trừ mà chữ số hàng đơn vị của số bị trừ nhỏ hơn chữ số hàng đơn vị của số trừ, cần mượn 1 từ hàng chục.

Quy tắc thực hiện:
Bước 1: Đặt tính thẳng cột.
Bước 2: Trừ hàng đơn vị. Nếu không đủ, mượn 1 từ hàng chục (hàng đơn vị tăng thêm 10).
Bước 3: Trừ hàng chục (nhớ trừ bớt 1 đã mượn).
Bước 4: Viết kết quả.

Ví dụ:
  72
- 38
----
  34

Giải thích: 2 < 8, mượn 1 từ hàng chục → 12 - 8 = 4. 7 - 1 - 3 = 3. Kết quả 34.

Bài tập:
1. Đặt tính rồi tính: 83 - 47 = ?
2. Đặt tính rồi tính: 65 - 28 = ?
3. Đặt tính rồi tính: 90 - 36 = ?
4. Vườn có 75 quả cam, hái đi 49 quả. Còn lại bao nhiêu quả cam?
5. Lớp có 62 học sinh, vắng 17 học sinh. Có bao nhiêu học sinh đi học?`,
  },
  {
    label: 'L2-03 Đơn vị đo độ dài cm và m',
    grade: 2,
    text: `Bài 3: Đơn vị đo độ dài — Xăng-ti-mét và Mét

Khái niệm xăng-ti-mét (cm):
Xăng-ti-mét là đơn vị đo độ dài. Ký hiệu: cm. Thước kẻ học sinh thường dài 20 cm hoặc 30 cm.

Khái niệm mét (m):
Mét là đơn vị đo độ dài lớn hơn xăng-ti-mét. Ký hiệu: m.
Công thức đổi đơn vị: 1 m = 100 cm.

Quy tắc đổi đơn vị:
- Đổi từ m sang cm: nhân với 100.
- Đổi từ cm sang m: chia cho 100.

Ví dụ:
- 2 m = 200 cm
- 3 m = 300 cm
- 150 cm = 1 m 50 cm

Dụng cụ đo:
Dùng thước thẳng để đo các vật ngắn (cm). Dùng thước dây để đo các vật dài (m).

Bài tập:
1. Đổi: 5 m = ___ cm
2. Đổi: 250 cm = ___ m ___ cm
3. Cây cột cờ cao 8 m. Cây cột cờ cao bao nhiêu cm?
4. Con đường dài 300 cm. Con đường dài mấy mét?
5. So sánh: 4 m ○ 350 cm`,
  },

  // ─── Lớp 3 ─────────────────────────────────────────────────────────────────
  {
    label: 'L3-01 Nhân số có hai chữ số với số có một chữ số',
    grade: 3,
    text: `Bài 1: Nhân số có hai chữ số với số có một chữ số

Định nghĩa:
Phép nhân số có hai chữ số với số có một chữ số là phép tính trong đó ta lấy một số gồm hai chữ số nhân với một số gồm một chữ số, kết quả có thể là số có hai hoặc ba chữ số.

Quy tắc nhân không nhớ:
Bước 1: Viết số có hai chữ số ở trên, số có một chữ số ở dưới, thẳng cột.
Bước 2: Nhân số có một chữ số với từng chữ số của số có hai chữ số, từ phải sang trái.

Quy tắc nhân có nhớ:
Khi tích của hàng đơn vị >= 10, viết chữ số hàng đơn vị và nhớ phần chục.

Ví dụ (không nhớ): 23 × 3 = 69
Ví dụ (có nhớ): 35 × 4 = 140

Giải thích: 5 × 4 = 20, viết 0 nhớ 2. 3 × 4 = 12, thêm 2 = 14. Kết quả 140.

Bài tập:
1. Tính: 24 × 3 = ?
2. Tính: 41 × 2 = ?
3. Tính: 36 × 4 = ?
4. Mỗi hộp có 12 bút chì. 5 hộp có tất cả bao nhiêu bút chì?
5. Một lớp có 28 học sinh. 3 lớp có bao nhiêu học sinh?`,
  },
  {
    label: 'L3-02 Chia số có hai chữ số cho số có một chữ số',
    grade: 3,
    text: `Bài 2: Chia số có hai chữ số cho số có một chữ số

Định nghĩa:
Phép chia số có hai chữ số cho số có một chữ số là tìm số thương khi lấy số bị chia chia cho số chia. Số chia khác 0.

Quy tắc chia hết:
Bước 1: Chia số hàng chục cho số chia.
Bước 2: Hạ chữ số hàng đơn vị xuống.
Bước 3: Chia phần còn lại.

Quy tắc chia có dư:
Tương tự, nhưng phần dư r < số chia. Kết quả: Số bị chia = Thương × Số chia + Số dư.

Ví dụ chia hết: 48 ÷ 4 = 12
Ví dụ chia có dư: 47 ÷ 4 = 11 dư 3

Bài tập:
1. Tính: 36 ÷ 3 = ?
2. Tính: 84 ÷ 4 = ?
3. Tính: 75 ÷ 6 = ? (dư mấy?)
4. Có 72 học sinh xếp thành 6 hàng đều nhau. Mỗi hàng có bao nhiêu học sinh?
5. Cô giáo có 50 cái kẹo chia đều cho 4 học sinh. Mỗi học sinh nhận được bao nhiêu cái, còn thừa mấy cái?`,
  },
  {
    label: 'L3-03 Chu vi hình chữ nhật và hình vuông',
    grade: 3,
    text: `Bài 3: Chu vi hình chữ nhật và hình vuông

Khái niệm chu vi:
Chu vi của một hình là tổng độ dài các cạnh của hình đó.

Chu vi hình chữ nhật:
Hình chữ nhật có hai chiều dài bằng nhau và hai chiều rộng bằng nhau.
Công thức: P = (dài + rộng) × 2
Trong đó: P là chu vi, dài là chiều dài, rộng là chiều rộng.

Chu vi hình vuông:
Hình vuông có bốn cạnh bằng nhau.
Công thức: P = cạnh × 4

Ví dụ hình chữ nhật:
Chiều dài 8 cm, chiều rộng 5 cm.
P = (8 + 5) × 2 = 13 × 2 = 26 cm.

Ví dụ hình vuông:
Cạnh = 6 cm.
P = 6 × 4 = 24 cm.

Bài tập:
1. Tính chu vi hình chữ nhật có chiều dài 10 cm, chiều rộng 7 cm.
2. Tính chu vi hình vuông có cạnh 9 cm.
3. Mảnh vườn hình chữ nhật dài 15 m, rộng 8 m. Tính chu vi mảnh vườn.
4. Hình vuông có chu vi 40 cm. Tính cạnh hình vuông.
5. So sánh chu vi: hình chữ nhật (dài 9, rộng 6) với hình vuông (cạnh 8).`,
  },

  // ─── Lớp 4 ─────────────────────────────────────────────────────────────────
  {
    label: 'L4-01 Phân số',
    grade: 4,
    text: `Bài 1: Phân số

Định nghĩa phân số:
Phân số có dạng a/b trong đó a là tử số và b là mẫu số (b ≠ 0). Phân số biểu thị một hay nhiều phần bằng nhau của một đơn vị.

Đọc phân số:
Phân số a/b đọc là "a phần b". Ví dụ: 3/4 đọc là "ba phần tư".

Tử số và mẫu số:
- Mẫu số cho biết đơn vị được chia thành bao nhiêu phần bằng nhau.
- Tử số cho biết lấy bao nhiêu phần như vậy.

So sánh phân số cùng mẫu:
Phân số nào có tử số lớn hơn thì lớn hơn. Ví dụ: 3/5 > 2/5.

So sánh phân số cùng tử:
Phân số nào có mẫu số lớn hơn thì nhỏ hơn. Ví dụ: 1/3 < 1/2.

Phân số bằng nhau:
Nhân hoặc chia cả tử và mẫu với cùng một số tự nhiên khác 0 thì được phân số bằng phân số đó.
Ví dụ: 1/2 = 2/4 = 3/6.

Bài tập:
1. Viết phân số: "ba phần năm".
2. Trong phân số 5/7, tử số là bao nhiêu? Mẫu số là bao nhiêu?
3. So sánh: 4/7 ○ 3/7
4. Rút gọn phân số: 6/8 = ?
5. Hình chữ nhật được chia thành 8 phần bằng nhau, tô màu 3 phần. Phân số nào biểu thị phần được tô màu?`,
  },
  {
    label: 'L4-02 Diện tích hình chữ nhật và hình vuông',
    grade: 4,
    text: `Bài 2: Diện tích hình chữ nhật và hình vuông

Khái niệm diện tích:
Diện tích của một hình là số đơn vị đo diện tích chứa trong hình đó. Đơn vị đo thường dùng: cm², m², dm².

Diện tích hình chữ nhật:
Công thức: S = dài × rộng
Trong đó S là diện tích, dài là chiều dài, rộng là chiều rộng.
Đơn vị: nếu dài và rộng tính bằng cm thì S tính bằng cm².

Diện tích hình vuông:
Công thức: S = cạnh × cạnh = cạnh²
Đơn vị: cm², m², dm² (tùy chiều dài cạnh).

Ví dụ hình chữ nhật:
Dài 12 cm, rộng 8 cm. S = 12 × 8 = 96 cm².

Ví dụ hình vuông:
Cạnh 7 cm. S = 7 × 7 = 49 cm².

Bài tập:
1. Tính diện tích hình chữ nhật dài 15 cm, rộng 6 cm.
2. Tính diện tích hình vuông có cạnh 11 cm.
3. Mảnh đất hình chữ nhật dài 20 m, rộng 12 m. Tính diện tích.
4. Hình vuông có diện tích 64 cm². Tính cạnh hình vuông.
5. So sánh diện tích: hình chữ nhật (dài 10, rộng 8) với hình vuông (cạnh 9).`,
  },
  {
    label: 'L4-03 Phép cộng phân số cùng mẫu',
    grade: 4,
    text: `Bài 3: Cộng hai phân số cùng mẫu số

Định nghĩa:
Khi cộng hai phân số có cùng mẫu số, ta cộng hai tử số và giữ nguyên mẫu số.

Công thức: a/n + b/n = (a + b)/n

Quy tắc:
Bước 1: Kiểm tra hai phân số có cùng mẫu số không.
Bước 2: Cộng hai tử số lại với nhau.
Bước 3: Giữ nguyên mẫu số.
Bước 4: Rút gọn kết quả nếu cần.

Ví dụ:
1/5 + 2/5 = 3/5
3/8 + 4/8 = 7/8
2/6 + 1/6 = 3/6 = 1/2 (rút gọn)

Lưu ý:
Nếu tổng bằng 1 (tử = mẫu) thì ghi là 1.
Ví dụ: 3/7 + 4/7 = 7/7 = 1.

Bài tập:
1. Tính: 2/9 + 4/9 = ?
2. Tính: 5/11 + 3/11 = ?
3. Tính rồi rút gọn: 3/10 + 5/10 = ?
4. An ăn 2/8 cái bánh buổi sáng, ăn thêm 3/8 cái bánh buổi chiều. An ăn tất cả bao nhiêu phần cái bánh?
5. Bể cá chứa 3/7 lít nước. Đổ thêm 2/7 lít. Bể có bao nhiêu lít nước?`,
  },

  // ─── Lớp 5 ─────────────────────────────────────────────────────────────────
  {
    label: 'L5-01 Diện tích hình thang',
    grade: 5,
    text: `Bài 1: Diện tích hình thang

Khái niệm hình thang:
Hình thang là hình tứ giác có một cặp cạnh đối song song nhau, gọi là hai đáy của hình thang (đáy lớn và đáy bé). Đường cao là khoảng cách vuông góc giữa hai đáy.

Công thức tính diện tích:
S = (đáy lớn + đáy bé) × chiều cao / 2
Hay: S = (a + b) × h / 2

Trong đó:
- a là độ dài đáy lớn
- b là độ dài đáy bé
- h là chiều cao
- S là diện tích

Ví dụ:
Hình thang có đáy lớn 12 cm, đáy bé 8 cm, chiều cao 6 cm.
S = (12 + 8) × 6 / 2 = 20 × 6 / 2 = 120 / 2 = 60 cm².

Bài tập:
1. Tính diện tích hình thang có đáy lớn 15 cm, đáy bé 9 cm, chiều cao 8 cm.
2. Tính diện tích hình thang có đáy lớn 20 m, đáy bé 14 m, chiều cao 10 m.
3. Hình thang có diện tích 72 cm², chiều cao 8 cm, đáy bé 5 cm. Tính đáy lớn.
4. Mảnh đất hình thang có hai đáy là 25 m và 17 m, chiều cao 12 m. Tính diện tích.
5. So sánh: hình thang (đáy lớn 16, đáy bé 10, h=7) với hình chữ nhật (dài 13, rộng 6).`,
  },
  {
    label: 'L5-02 Phần trăm',
    grade: 5,
    text: `Bài 2: Phần trăm (%)

Định nghĩa phần trăm:
Phần trăm biểu thị số phần trên tổng số 100 phần bằng nhau. Ký hiệu: %.
1% = 1/100.

Cách đọc và viết:
Số phần trăm viết sau số tự nhiên hoặc thập phân, kèm ký hiệu %.
Ví dụ: 25%, 0.5%, 150%.

Chuyển đổi:
- Phân số sang %: nhân tử và mẫu để mẫu = 100, hoặc chia tử cho mẫu rồi nhân 100.
  Ví dụ: 3/4 = 75%.
- % sang phân số: viết phần trăm trên 100 rồi rút gọn.
  Ví dụ: 40% = 40/100 = 2/5.
- % sang số thập phân: chia cho 100.
  Ví dụ: 35% = 0,35.

Tính phần trăm của một số:
Công thức: A% của B = A × B / 100.
Ví dụ: 20% của 150 = 20 × 150 / 100 = 30.

Bài tập:
1. Chuyển phân số sang %: 1/4 = ?%
2. Chuyển % sang phân số: 60% = ?
3. Tính 15% của 200.
4. Lớp học có 40 học sinh, số học sinh nữ chiếm 45%. Có bao nhiêu học sinh nữ?
5. Cửa hàng giảm giá 30% cho áo có giá gốc 250 000 đồng. Giá sau giảm là bao nhiêu?`,
  },
  {
    label: 'L5-03 Thể tích hình hộp chữ nhật',
    grade: 5,
    text: `Bài 3: Thể tích hình hộp chữ nhật

Khái niệm thể tích:
Thể tích của một vật là phần không gian mà vật đó chiếm. Đơn vị đo: cm³, dm³, m³.
1 dm³ = 1 lít.

Hình hộp chữ nhật:
Hình hộp chữ nhật có 6 mặt đều là hình chữ nhật. Có 3 kích thước: chiều dài (a), chiều rộng (b), chiều cao (c).

Công thức tính thể tích:
V = a × b × c
(dài × rộng × cao)

Ví dụ:
Hình hộp chữ nhật dài 5 cm, rộng 4 cm, cao 3 cm.
V = 5 × 4 × 3 = 60 cm³.

Diện tích toàn phần:
S = 2 × (ab + bc + ca)

Ví dụ:
S = 2 × (5×4 + 4×3 + 3×5) = 2 × (20 + 12 + 15) = 2 × 47 = 94 cm².

Bài tập:
1. Tính thể tích hình hộp chữ nhật: dài 8 cm, rộng 5 cm, cao 4 cm.
2. Tính thể tích bể cá hình hộp chữ nhật: dài 60 cm, rộng 30 cm, cao 40 cm.
3. Thùng đựng hàng có thể tích 120 dm³, dài 6 dm, rộng 4 dm. Tính chiều cao.
4. Tính diện tích toàn phần hình hộp chữ nhật: dài 7, rộng 5, cao 3 (cm).
5. So sánh thể tích: hình hộp (6×5×4) với hình hộp (8×4×4).`,
  },

  // ─── Lớp 6 ─────────────────────────────────────────────────────────────────
  {
    label: 'L6-01 Ước chung lớn nhất (ƯCLN)',
    grade: 6,
    text: `Bài 1: Ước chung lớn nhất (ƯCLN)

Định nghĩa ước:
Số tự nhiên a là ước của b nếu b chia hết cho a (b = a × q, q ∈ ℕ). Ký hiệu: a | b.

Định nghĩa ước chung:
Ước chung của hai hay nhiều số là số vừa là ước của số này, vừa là ước của số kia.

Định nghĩa ƯCLN:
Ước chung lớn nhất (ƯCLN) của hai số là số lớn nhất trong tập các ước chung.

Phương pháp tìm ƯCLN:
Cách 1 — Phân tích ra thừa số nguyên tố:
Bước 1: Phân tích mỗi số thành tích các thừa số nguyên tố.
Bước 2: Lấy các thừa số nguyên tố chung với số mũ nhỏ nhất.

Ví dụ: ƯCLN(12, 18) = ?
12 = 2² × 3
18 = 2 × 3²
ƯCLN = 2¹ × 3¹ = 6.

Cách 2 — Thuật toán Euclid:
ƯCLN(a, b) = ƯCLN(b, a mod b) cho đến khi số dư bằng 0.
Ví dụ: ƯCLN(24, 36) = ƯCLN(36, 24) = ƯCLN(24, 12) = ƯCLN(12, 0) = 12.

Bài tập:
1. Tìm ƯCLN(16, 24).
2. Tìm ƯCLN(45, 30).
3. Tìm ƯCLN(48, 64, 80).
4. Có 24 bút chì xanh và 36 bút chì đỏ. Chia đều vào các hộp sao cho mỗi hộp có cả hai màu. Nhiều nhất bao nhiêu hộp?
5. Tìm các ước chung của 18 và 24.`,
  },
  {
    label: 'L6-02 Bội chung nhỏ nhất (BCNN)',
    grade: 6,
    text: `Bài 2: Bội chung nhỏ nhất (BCNN)

Định nghĩa bội:
Số tự nhiên b là bội của a nếu b = a × k (k ∈ ℕ). Ký hiệu: a | b.

Bội chung:
Bội chung của hai hay nhiều số là số vừa là bội của số này vừa là bội của số kia.

BCNN (Bội chung nhỏ nhất):
BCNN của hai hay nhiều số là số nhỏ nhất trong các bội chung khác 0.

Quan hệ ƯCLN và BCNN:
ƯCLN(a,b) × BCNN(a,b) = a × b

Phương pháp tính BCNN:
Bước 1: Phân tích mỗi số ra thừa số nguyên tố.
Bước 2: Lấy tất cả thừa số nguyên tố (cả chung lẫn riêng) với số mũ cao nhất.

Ví dụ: BCNN(12, 18) = ?
12 = 2² × 3
18 = 2 × 3²
BCNN = 2² × 3² = 36.

Ví dụ khác: BCNN(4, 6, 9):
4 = 2², 6 = 2 × 3, 9 = 3²
BCNN = 2² × 3² = 36.

Bài tập:
1. Tính BCNN(8, 12).
2. Tính BCNN(15, 25).
3. Tính BCNN(6, 10, 15).
4. Đèn đỏ nháy mỗi 4 giây, đèn xanh nháy mỗi 6 giây. Sau bao lâu hai đèn nháy cùng lúc?
5. Kiểm tra: ƯCLN(12, 18) × BCNN(12, 18) = 12 × 18?`,
  },
  {
    label: 'L6-03 Phân số thập phân và số thập phân',
    grade: 6,
    text: `Bài 3: Số thập phân

Định nghĩa số thập phân:
Số thập phân là số có phần nguyên và phần thập phân, ngăn cách bởi dấu phẩy (,).
Ví dụ: 3,14 có phần nguyên là 3, phần thập phân là 14.

Giá trị vị trí:
Phần thập phân: chữ số sau dấu phẩy đầu tiên là phần mười (0,1), tiếp theo là phần trăm (0,01), phần nghìn (0,001)...

Đọc số thập phân:
3,14: đọc là "ba phẩy mười bốn" hoặc "ba phẩy một bốn".
0,05: đọc là "không phẩy không năm".

Cộng và trừ số thập phân:
- Đặt dấu phẩy thẳng cột.
- Cộng/trừ như số tự nhiên.
- Đặt dấu phẩy vào kết quả.
Ví dụ: 4,35 + 2,18 = 6,53.

Nhân số thập phân với số tự nhiên:
Nhân như số tự nhiên, đếm chữ số phần thập phân rồi đặt dấu phẩy.
Ví dụ: 2,4 × 3 = 7,2.

Bài tập:
1. Tính: 5,67 + 3,24 = ?
2. Tính: 8,90 - 4,35 = ?
3. Tính: 1,25 × 4 = ?
4. Sắp xếp tăng dần: 0,5; 0,35; 0,125; 0,8
5. Giá xăng 25,700 đồng/lít. Mua 8 lít hết bao nhiêu tiền?`,
  },

  // ─── Lớp 7 ─────────────────────────────────────────────────────────────────
  {
    label: 'L7-01 Tỉ lệ thức',
    grade: 7,
    text: `Bài 1: Tỉ lệ thức

Định nghĩa tỉ số:
Tỉ số của hai số a và b (b ≠ 0) là thương a : b = a/b.

Định nghĩa tỉ lệ thức:
Tỉ lệ thức là đẳng thức của hai tỉ số: a/b = c/d hay a:b = c:d.
a, d là ngoại tỉ; b, c là trung tỉ.

Tính chất cơ bản:
Nếu a/b = c/d thì a × d = b × c (tích ngoại tỉ = tích trung tỉ).

Tính chất hoán vị:
Từ a/b = c/d suy ra: a/c = b/d, d/b = c/a, b/a = d/c.

Ứng dụng tìm thành phần chưa biết:
Ví dụ: Tìm x trong tỉ lệ thức 2/3 = x/15.
2 × 15 = 3 × x → x = 30/3 = 10.

Bài tập:
1. Lập tỉ lệ thức từ: 2, 5, 4, 10.
2. Tìm x: x/4 = 9/12.
3. Tìm y: 3/y = 6/14.
4. Kiểm tra: 2/3 và 8/12 có lập thành tỉ lệ thức không?
5. Một ô tô đi 120 km trong 2 giờ. Hỏi đi 450 km trong mấy giờ (vận tốc không đổi)?`,
  },
  {
    label: 'L7-02 Tam giác đồng dạng',
    grade: 7,
    text: `Bài 2: Tam giác đồng dạng

Định nghĩa:
Hai tam giác gọi là đồng dạng nếu các góc tương ứng bằng nhau và các cạnh tương ứng tỉ lệ với nhau.
Ký hiệu: △ABC ∽ △A'B'C'.

Tỉ số đồng dạng:
k = A'B'/AB = B'C'/BC = A'C'/AC (k > 0).

Điều kiện đồng dạng (các trường hợp):
1. TH góc-góc (g-g): Hai góc của tam giác này bằng hai góc của tam giác kia.
2. TH cạnh-cạnh-cạnh (c-c-c): Ba cặp cạnh tương ứng tỉ lệ.
3. TH cạnh-góc-cạnh (c-g-c): Một góc bằng nhau và hai cặp cạnh kề góc tỉ lệ.

Hệ quả:
Tỉ số hai chu vi = k (tỉ số đồng dạng).
Tỉ số hai diện tích = k².

Ví dụ:
△ABC có BC = 6 cm, △A'B'C' có B'C' = 9 cm. Nếu đồng dạng thì k = 9/6 = 3/2.

Bài tập:
1. Hai tam giác đồng dạng với tỉ số k = 2. Tam giác nhỏ có cạnh 3 cm. Tam giác lớn có cạnh tương ứng là bao nhiêu?
2. △ABC ∽ △DEF với AB = 4, DE = 6. Tính tỉ số k.
3. Chứng minh hai tam giác đồng dạng nếu hai góc bằng nhau.
4. Tỉ số diện tích hai tam giác đồng dạng là 4:9. Tỉ số đồng dạng là bao nhiêu?
5. Cột cao 6 m bóng dài 4 m. Cây cao x m bóng dài 6 m. Tính x.`,
  },

  // ─── Lớp 8 ─────────────────────────────────────────────────────────────────
  {
    label: 'L8-01 Phương trình bậc nhất một ẩn',
    grade: 8,
    text: `Bài 1: Phương trình bậc nhất một ẩn

Định nghĩa:
Phương trình bậc nhất một ẩn có dạng ax + b = 0 (a ≠ 0), trong đó x là ẩn, a và b là hệ số.

Nghiệm phương trình:
x₀ là nghiệm nếu thay x = x₀ vào phương trình được đẳng thức đúng.
Phương trình ax + b = 0 có duy nhất một nghiệm: x = -b/a.

Quy tắc giải phương trình:
Quy tắc chuyển vế: Chuyển một hạng tử từ vế này sang vế kia, đổi dấu.
Quy tắc nhân: Nhân (chia) cả hai vế với cùng một số khác 0.

Ví dụ 1: 2x + 6 = 0
2x = -6 → x = -3.

Ví dụ 2: 3x - 9 = 6
3x = 15 → x = 5.

Phương trình tương đương:
Hai phương trình tương đương nếu chúng có cùng tập nghiệm.

Bài tập:
1. Giải: 4x - 8 = 0.
2. Giải: 5x + 15 = 0.
3. Giải: 2x + 3 = 11.
4. Giải: 3(x - 2) = 9.
5. Tìm x: 2(3x + 1) - 4 = 3(x - 2) + 5.`,
  },
  {
    label: 'L8-02 Hình thoi và hình bình hành',
    grade: 8,
    text: `Bài 2: Hình thoi và hình bình hành

Hình bình hành:
Định nghĩa: Hình bình hành là tứ giác có các cặp cạnh đối song song và bằng nhau.
Tính chất:
- Các cạnh đối bằng nhau: AB = CD, BC = AD.
- Các góc đối bằng nhau: ∠A = ∠C, ∠B = ∠D.
- Hai đường chéo cắt nhau tại trung điểm mỗi đường.
Diện tích: S = đáy × chiều cao = a × h.

Hình thoi:
Định nghĩa: Hình thoi là hình bình hành có bốn cạnh bằng nhau.
Tính chất đặc biệt:
- Hai đường chéo vuông góc nhau tại trung điểm.
- Hai đường chéo là phân giác của các góc.
Chu vi: P = 4a.
Diện tích: S = (d₁ × d₂)/2 trong đó d₁, d₂ là hai đường chéo.

Ví dụ hình thoi:
Đường chéo 6 cm và 8 cm.
S = (6 × 8)/2 = 24 cm².

Bài tập:
1. Hình bình hành đáy 12 cm, chiều cao 7 cm. Tính diện tích.
2. Hình thoi hai đường chéo 10 cm và 14 cm. Tính diện tích.
3. Hình thoi cạnh 8 cm. Tính chu vi.
4. Hình bình hành diện tích 56 cm², đáy 8 cm. Tính chiều cao.
5. Chứng minh hình thoi là hình bình hành đặc biệt.`,
  },

  // ─── Lớp 9 ─────────────────────────────────────────────────────────────────
  {
    label: 'L9-01 Hàm số bậc nhất',
    grade: 9,
    text: `Bài 1: Hàm số bậc nhất y = ax + b

Định nghĩa:
Hàm số bậc nhất là hàm số có dạng y = ax + b (a ≠ 0), trong đó a, b là hằng số.

Đồ thị hàm số bậc nhất:
Đồ thị là đường thẳng. Đường thẳng y = ax + b:
- Cắt trục tung tại điểm (0, b) — tung độ góc b.
- Hệ số a là hệ số góc (độ nghiêng của đường thẳng).

Tính đơn điệu:
- a > 0: hàm số đồng biến (y tăng khi x tăng).
- a < 0: hàm số nghịch biến (y giảm khi x tăng).

Giao điểm với trục tọa độ:
- Trục Oy: x = 0 → y = b. Điểm (0, b).
- Trục Ox: y = 0 → x = -b/a. Điểm (-b/a, 0).

Hai đường thẳng song song:
y = ax + b và y = a'x + b' song song khi a = a' và b ≠ b'.

Ví dụ:
y = 2x + 3: a = 2 > 0 (đồng biến), cắt Oy tại (0, 3), cắt Ox tại (-3/2, 0).

Bài tập:
1. Xác định hệ số a, b: y = -3x + 5.
2. Vẽ đồ thị: y = 2x - 1.
3. Hàm số nào đồng biến: y = 3x + 1 hay y = -2x + 7?
4. Hai đường thẳng có song song không: y = 3x + 2 và y = 3x - 5?
5. Tìm giao điểm của y = 2x + 1 với trục Ox và Oy.`,
  },
  {
    label: 'L9-02 Định lý Pythagore',
    grade: 9,
    text: `Bài 2: Định lý Py-ta-go

Định lý Pythagore (Py-ta-go):
Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.
Công thức: c² = a² + b²
Trong đó c là cạnh huyền, a và b là hai cạnh góc vuông.

Đảo lý:
Nếu tam giác có c² = a² + b² thì tam giác đó là tam giác vuông tại đỉnh đối diện với c.

Bộ ba Pythagore:
Các bộ ba số nguyên dương (a, b, c) thỏa c² = a² + b² gọi là bộ ba Pythagore.
Ví dụ phổ biến: (3, 4, 5); (5, 12, 13); (6, 8, 10); (8, 15, 17).

Ứng dụng:
Tính cạnh huyền: c = √(a² + b²).
Tính cạnh góc vuông: a = √(c² - b²).

Ví dụ:
Tam giác vuông có hai cạnh góc vuông 3 cm và 4 cm.
c = √(3² + 4²) = √(9 + 16) = √25 = 5 cm.

Bài tập:
1. Tam giác vuông có hai cạnh góc vuông 6 cm và 8 cm. Tính cạnh huyền.
2. Tam giác vuông có cạnh huyền 13 cm, một cạnh góc vuông 5 cm. Tính cạnh còn lại.
3. Kiểm tra tam giác có cạnh 7, 24, 25 có phải tam giác vuông không?
4. Cây thang dựa vào tường, chân thang cách tường 4 m, đỉnh thang cao 3 m. Thang dài bao nhiêu?
5. Đường chéo hình chữ nhật 10 cm, chiều rộng 6 cm. Tính chiều dài.`,
  },
  {
    label: 'L9-03 Hệ phương trình bậc nhất hai ẩn',
    grade: 9,
    text: `Bài 3: Hệ phương trình bậc nhất hai ẩn

Định nghĩa:
Hệ phương trình bậc nhất hai ẩn x, y gồm hai phương trình:
{ ax + by = c
{ a'x + b'y = c'

Cặp số (x₀, y₀) là nghiệm nếu thỏa cả hai phương trình.

Phương pháp thế:
Bước 1: Từ một phương trình, biểu diễn x (hay y) theo y (hay x).
Bước 2: Thay vào phương trình kia, giải phương trình một ẩn.
Bước 3: Tìm ẩn còn lại.

Phương pháp cộng đại số:
Bước 1: Nhân hai phương trình với hệ số thích hợp để hệ số của một ẩn bằng nhau (hoặc đối nhau).
Bước 2: Cộng (hoặc trừ) hai phương trình để khử một ẩn.
Bước 3: Giải rồi tìm ẩn còn lại.

Ví dụ (phương pháp thế):
{ 2x + y = 5   (1)
{ x - y = 1    (2)

Từ (2): x = 1 + y. Thay vào (1): 2(1+y) + y = 5 → 2 + 3y = 5 → y = 1.
x = 1 + 1 = 2. Nghiệm: (2, 1).

Bài tập:
1. Giải hệ: { x + y = 7 / { x - y = 3.
2. Giải hệ: { 2x + 3y = 12 / { x - y = 1.
3. Giải hệ: { 3x + 2y = 8 / { x + y = 3.
4. Tổng hai số là 56, hiệu là 14. Tìm hai số đó.
5. Một xe máy và một xe đạp cùng xuất phát, đi cùng chiều. Sau 2 giờ xe máy hơn xe đạp 60 km. Vận tốc xe máy là 40 km/h. Tìm vận tốc xe đạp.`,
  },

  // ─── Thêm bài đặc trưng cho bộ benchmark ───────────────────────────────────
  {
    label: 'L3-04 Bảng nhân 4 và 5',
    grade: 3,
    text: `Bài 4: Bảng nhân 4 và bảng nhân 5

Bảng nhân 4:
4 × 1 = 4
4 × 2 = 8
4 × 3 = 12
4 × 4 = 16
4 × 5 = 20
4 × 6 = 24
4 × 7 = 28
4 × 8 = 32
4 × 9 = 36
4 × 10 = 40

Bảng nhân 5:
5 × 1 = 5
5 × 2 = 10
5 × 3 = 15
5 × 4 = 20
5 × 5 = 25
5 × 6 = 30
5 × 7 = 35
5 × 8 = 40
5 × 9 = 45
5 × 10 = 50

Tính chất giao hoán: a × b = b × a.
Ví dụ: 4 × 7 = 7 × 4 = 28.

Nhận xét bảng nhân 5:
Kết quả của bảng nhân 5 luôn tận cùng bằng 0 hoặc 5.

Ứng dụng:
4 × 6 = 24: Có 6 chiếc bàn, mỗi bàn 4 học sinh. Có 24 học sinh.
5 × 7 = 35: Có 7 hàng cây, mỗi hàng 5 cây. Có 35 cây.

Bài tập:
1. Tính: 4 × 8 = ?
2. Tính: 5 × 9 = ?
3. Điền kết quả: 4 × ___ = 32
4. Lớp học có 6 dãy, mỗi dãy 5 học sinh. Lớp có bao nhiêu học sinh?
5. Cô mua 4 hộp sữa, mỗi hộp 8 cái. Cô mua bao nhiêu cái sữa?`,
  },
  {
    label: 'L5-04 Vận tốc - Quãng đường - Thời gian',
    grade: 5,
    text: `Bài 4: Vận tốc, Quãng đường, Thời gian

Định nghĩa vận tốc:
Vận tốc là quãng đường đi được trong một đơn vị thời gian.
Đơn vị: km/h (kilômét/giờ), m/phút, m/giây.

Công thức liên hệ:
Vận tốc:    v = s / t
Quãng đường: s = v × t
Thời gian:   t = s / v

Trong đó: v = vận tốc, s = quãng đường, t = thời gian.

Ví dụ 1 — Tính vận tốc:
Ô tô đi 120 km trong 3 giờ.
v = 120 / 3 = 40 km/h.

Ví dụ 2 — Tính quãng đường:
Đi với vận tốc 50 km/h trong 2,5 giờ.
s = 50 × 2,5 = 125 km.

Ví dụ 3 — Tính thời gian:
Đi 180 km với vận tốc 60 km/h.
t = 180 / 60 = 3 giờ.

Bài tập:
1. Xe máy đi 150 km trong 3 giờ. Tính vận tốc.
2. Người đi bộ vận tốc 5 km/h trong 2 giờ. Đi được bao nhiêu km?
3. Tàu đi 360 km với vận tốc 90 km/h. Mất bao nhiêu giờ?
4. Hai địa điểm cách nhau 240 km. Ô tô đi với vận tốc 80 km/h. Đến nơi sau bao lâu?
5. Bơi với vận tốc 2 m/s. Hồ bơi dài 50 m. Bơi qua hồ mất bao nhiêu giây?`,
  },
  {
    label: 'L6-04 Lũy thừa với số mũ tự nhiên',
    grade: 6,
    text: `Bài 4: Lũy thừa với số mũ tự nhiên

Định nghĩa:
Lũy thừa bậc n của số a (n ∈ ℕ*, a ∈ ℝ) là tích của n thừa số a.
Ký hiệu: aⁿ = a × a × ... × a (n lần).
a là cơ số, n là số mũ.

Trường hợp đặc biệt:
a⁰ = 1 (a ≠ 0).
a¹ = a.

Quy tắc nhân và chia:
aᵐ × aⁿ = aᵐ⁺ⁿ
aᵐ ÷ aⁿ = aᵐ⁻ⁿ (m > n, a ≠ 0)

Quy tắc lũy thừa của lũy thừa:
(aᵐ)ⁿ = aᵐˣⁿ

Quy tắc lũy thừa của tích:
(a × b)ⁿ = aⁿ × bⁿ

Ví dụ:
2³ = 2 × 2 × 2 = 8.
3⁴ = 3 × 3 × 3 × 3 = 81.
2³ × 2⁴ = 2⁷ = 128.
(2³)² = 2⁶ = 64.

Bài tập:
1. Tính: 5³ = ?
2. Tính: 2⁵ = ?
3. Tính: 3² × 3³ = ?
4. So sánh: 2¹⁰ ○ 10²
5. Một ô vuông nhỏ cạnh 2 cm. Hình vuông lớn cạnh 2³ cm. Diện tích hình vuông lớn là bao nhiêu?`,
  },
  {
    label: 'L8-03 Tam thức bậc hai',
    grade: 8,
    text: `Bài 3: Hằng đẳng thức đáng nhớ

Các hằng đẳng thức đáng nhớ:
1. Bình phương tổng: (a + b)² = a² + 2ab + b²
2. Bình phương hiệu: (a - b)² = a² - 2ab + b²
3. Hiệu hai bình phương: a² - b² = (a + b)(a - b)
4. Lập phương tổng: (a + b)³ = a³ + 3a²b + 3ab² + b³
5. Lập phương hiệu: (a - b)³ = a³ - 3a²b + 3ab² - b³
6. Tổng hai lập phương: a³ + b³ = (a + b)(a² - ab + b²)
7. Hiệu hai lập phương: a³ - b³ = (a - b)(a² + ab + b²)

Ứng dụng khai triển:
(x + 3)² = x² + 6x + 9.
(2x - 1)² = 4x² - 4x + 1.

Ứng dụng thu gọn (tính nhanh):
101² = (100 + 1)² = 10000 + 200 + 1 = 10201.
99² = (100 - 1)² = 10000 - 200 + 1 = 9801.

Phân tích nhân tử:
x² - 9 = (x + 3)(x - 3).
4x² - 25 = (2x + 5)(2x - 5).

Bài tập:
1. Khai triển: (x + 5)².
2. Khai triển: (3x - 2)².
3. Tính nhanh: 97² = ?
4. Phân tích: 9x² - 16 thành nhân tử.
5. Chứng minh: (a + b)² - (a - b)² = 4ab.`,
  },
  {
    label: 'L4-04 Góc nhọn góc tù góc bẹt',
    grade: 4,
    text: `Bài 4: Góc — Phân loại và đo góc

Định nghĩa góc:
Góc là hình gồm hai tia chung gốc. Gốc chung gọi là đỉnh của góc. Hai tia gọi là hai cạnh của góc.

Đơn vị đo góc:
Đơn vị đo góc là độ (°). 1 góc vuông = 90°. 1 vòng = 360°.

Phân loại góc theo độ lớn:
- Góc nhọn: 0° < góc < 90°.
- Góc vuông: góc = 90°.
- Góc tù: 90° < góc < 180°.
- Góc bẹt: góc = 180° (hai tia đối nhau).
- Góc toàn: góc = 360°.

Dụng cụ đo góc: thước đo góc (thước đo độ).

Góc đặc biệt trong tam giác:
Tổng ba góc của tam giác = 180°.
Tam giác vuông có một góc = 90°.
Tam giác đều có ba góc bằng nhau, mỗi góc = 60°.

Ví dụ:
Tam giác có hai góc là 60° và 70°. Góc thứ ba = 180° - 60° - 70° = 50°.

Bài tập:
1. Phân loại góc: 45°, 90°, 120°, 180°, 35°.
2. Tổng hai góc của tam giác là 130°. Góc thứ ba là bao nhiêu?
3. Tam giác cân có góc ở đỉnh 40°. Tính hai góc còn lại.
4. Vẽ góc 60° bằng thước đo độ.
5. Chứng minh: Tam giác đều có mỗi góc bằng 60°.`,
  },
  {
    label: 'L2-04 Bảng nhân 2 và bảng nhân 3',
    grade: 2,
    text: `Bài 4: Bảng nhân 2 và bảng nhân 3

Bảng nhân 2:
2 × 1 = 2
2 × 2 = 4
2 × 3 = 6
2 × 4 = 8
2 × 5 = 10
2 × 6 = 12
2 × 7 = 14
2 × 8 = 16
2 × 9 = 18
2 × 10 = 20

Bảng nhân 3:
3 × 1 = 3
3 × 2 = 6
3 × 3 = 9
3 × 4 = 12
3 × 5 = 15
3 × 6 = 18
3 × 7 = 21
3 × 8 = 24
3 × 9 = 27
3 × 10 = 30

Ý nghĩa phép nhân:
a × b là tổng của b số hạng a bằng nhau, hoặc tổng của a số hạng b bằng nhau.
Ví dụ: 2 × 5 = 2 + 2 + 2 + 2 + 2 = 10.

Tính chất giao hoán:
2 × 5 = 5 × 2 = 10.

Bài tập:
1. Tính: 3 × 6 = ?
2. Tính: 2 × 9 = ?
3. Điền: 3 × ___ = 27.
4. Có 3 túi cam, mỗi túi 7 quả. Có tất cả bao nhiêu quả cam?
5. Mỗi bàn có 2 học sinh. 8 bàn có bao nhiêu học sinh?`,
  },
  {
    label: 'L7-03 Thống kê mô tả cơ bản',
    grade: 7,
    text: `Bài 3: Thống kê mô tả cơ bản

Khái niệm số liệu thống kê:
Số liệu thống kê là các số thu thập được từ quan sát, điều tra, thí nghiệm.
Mỗi giá trị trong bộ số liệu gọi là một quan sát.

Tần số:
Tần số của một giá trị là số lần giá trị đó xuất hiện trong bộ số liệu. Ký hiệu n(xᵢ) hay fᵢ.

Số trung bình cộng (Mean):
x̄ = (x₁ + x₂ + ... + xₙ) / n = Σxᵢ / n.
Ý nghĩa: Giá trị đặc trưng cho cả nhóm số liệu.

Số trung vị (Median):
Giá trị ở giữa khi sắp xếp số liệu theo thứ tự tăng (hoặc giảm) dần.
- Số lẻ quan sát: trung vị là giá trị chính giữa.
- Số chẵn quan sát: trung vị là trung bình cộng hai giá trị giữa.

Mốt (Mode):
Mốt là giá trị xuất hiện nhiều nhất trong bộ số liệu.

Ví dụ:
Bộ số liệu: 5, 7, 3, 7, 9, 7, 4, 6.
Sắp xếp: 3, 4, 5, 6, 7, 7, 7, 9.
x̄ = (3+4+5+6+7+7+7+9)/8 = 48/8 = 6.
Trung vị = (6+7)/2 = 6,5.
Mốt = 7 (xuất hiện 3 lần).

Bài tập:
1. Tính trung bình: 10, 8, 7, 9, 6.
2. Tìm trung vị: 2, 5, 8, 3, 7, 4.
3. Tìm mốt: 3, 5, 3, 7, 5, 3, 8, 5, 3.
4. Điểm kiểm tra: 7, 8, 6, 9, 7, 8, 7, 10. Tính điểm trung bình.
5. Khi nào nên dùng trung vị thay vì trung bình?`,
  },
];
