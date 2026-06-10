# LEARNING_FLOW_V2.md

## Mục tiêu

Chuẩn hóa trải nghiệm học tập cho toàn bộ LMS.

Áp dụng cho:

* Ngoại ngữ
* Toán học
* Tiếng Việt

Không thay đổi code hiện tại.

Không thay đổi database.

Không thay đổi API cũ.

Chỉ bổ sung lớp điều phối học tập mới.

---

# TRIẾT LÝ THIẾT KẾ

Học sinh không được phép bị "lạc đường".

Sau mỗi hành động:

* Hệ thống phải biết học sinh đang ở đâu
* Hệ thống phải biết nên học gì tiếp theo
* Hệ thống phải hiển thị bước tiếp theo

---

# LEARNING FLOW CHUẨN

```text
Lesson
 ↓
Exercise
 ↓
AI Explain
 ↓
Mini Game
 ↓
Mastery Update
 ↓
Recommendation
 ↓
Next Lesson
```

---

# MODULE MỚI

```text
src/modules/learning-flow
```

## Chức năng

Learning Flow Service không thay thế module cũ.

Nó chỉ điều phối.

---

# FLOW 1 — HỌC BÀI

Người học mở bài học.

```text
Lesson
 ↓
Hoàn thành
 ↓
+5 XP
 ↓
Mở Exercise
```

---

# FLOW 2 — LÀM BÀI TẬP

```text
Exercise
 ↓
Submit
 ↓
Chấm điểm
 ↓
Cập nhật Mastery
```

Quy tắc:

> = 80%

```text
Mastery +10
```

50-79%

```text
Mastery +5
```

< 50%

```text
Review Required
```

---

# FLOW 3 — AI GIẢI THÍCH

Sau bài tập:

```text
Sai
 ↓
AI Explain
```

AI phải:

* Giải thích lỗi
* Đưa ví dụ mới
* Gợi ý luyện tập

Không trả lời lan man.

---

# FLOW 4 — MINI GAME

Sau AI Explain:

```text
Mini Game
```

Mục tiêu:

Ôn lại kiến thức vừa học.

---

# GAME THEO MÔN

## NGOẠI NGỮ

Vocabulary Hunter

Sentence Builder

Pronunciation Challenge

---

## TOÁN HỌC

Speed Math

Formula Hunt

Math Adventure

---

## TIẾNG VIỆT

Chính Tả Thần Tốc

Ghép Từ

Nhà Văn Nhí

---

# FLOW 5 — MASTERY UPDATE

Mỗi hoạt động đều cập nhật:

```json
{
  "subject": "language",
  "topic": "vocabulary",
  "mastery": 75
}
```

---

# FLOW 6 — AI RECOMMENDATION

Sau mỗi phiên học:

```text
Hôm nay nên học gì?
```

API:

```text
GET /learning/recommendation
```

Ví dụ:

```json
{
  "subject": "math",
  "topic": "fractions",
  "reason": "Mastery thấp",
  "nextAction": "Làm bài tập phân số"
}
```

---

# DASHBOARD CHUẨN

Chỉ giữ:

## Tiếp tục học

Bài học gần nhất.

---

## Hôm nay học gì

Từ Recommendation Engine.

---

## Bài tập cần làm

Todo đang chờ.

---

## AI đề xuất

* AI Gia sư
* Ôn tập
* Lộ trình

---

## Tiến độ học tập

* Ngoại ngữ
* Toán học
* Tiếng Việt

---

# MASTERY CHUẨN

Thang điểm:

```text
0-20      Beginner
21-40     Basic
41-60     Developing
61-80     Proficient
81-100    Mastered
```

---

# XP SYSTEM

Lesson hoàn thành:

+5 XP

Exercise:

+10 XP

Mini Game:

+10 XP

Perfect Game:

+25 XP

Daily Streak:

+20 XP

---

# ROADMAP CHUẨN

Mỗi môn:

```text
Chương
 ↓
Bài học
 ↓
Bài tập
 ↓
Mini Game
 ↓
Milestone
```

Không hiển thị quá nhiều lựa chọn.

---

# KHÔNG TRIỂN KHAI

Không thêm:

* AI Teacher mới
* AI Mentor mới
* Career Advisor mới
* Marketplace mới
* Dashboard mới
* Agent mới

Cho đến khi Learning Flow hoàn thiện.

---

# ĐỊNH NGHĨA HOÀN THIỆN

Một học sinh mới có thể:

Đăng nhập
↓
Học bài
↓
Làm bài tập
↓
Hỏi AI
↓
Chơi Game
↓
Nhận XP
↓
Tăng Mastery
↓
Biết học gì tiếp theo

mà không cần hướng dẫn.

Khi đạt được điều này:

Learning Flow V2 = Hoàn thành.
