# PROGRESS_SYSTEM_V1.md

## Mục tiêu

Chuẩn hóa toàn bộ hệ thống theo một câu hỏi duy nhất:

```text
Tôi đang ở đâu?
Tôi tiến bộ thế nào?
Tôi nên học gì tiếp?
```

Người học không cần xem nhiều dashboard.

---

# PROGRESS MODEL

Mỗi học sinh có:

```json
{
  "xp": 1250,
  "level": 7,
  "streak": 12,
  "mastery": {
    "language": 68,
    "math": 54,
    "viet": 72
  }
}
```

---

# XP SYSTEM

## Lesson

```text
Hoàn thành bài học
+5 XP
```

## Exercise

```text
Hoàn thành bài tập
+10 XP
```

## Quiz

```text
Điểm >= 80%
+15 XP
```

## Mini Game

```text
Hoàn thành game
+10 XP
```

## Perfect

```text
100% chính xác
+25 XP
```

---

# LEVEL SYSTEM

```text
Level 1   Beginner
Level 2   Explorer
Level 3   Learner
Level 4   Scholar
Level 5   Advanced
Level 6   Expert
Level 7   Master
Level 8   Grand Master
Level 9   Legend
Level 10  Ultimate
```

---

# STREAK SYSTEM

## Daily Learning

Học ít nhất:

```text
1 bài học
hoặc
1 bài tập
hoặc
1 game
```

sẽ tính streak.

---

## Bonus

```text
3 ngày    +10 XP
7 ngày    +20 XP
30 ngày   +100 XP
```

---

# MASTERY SYSTEM

## Thang đo

```text
0-20    Beginner
21-40   Basic
41-60   Developing
61-80   Proficient
81-100  Mastered
```

---

## Công thức

```text
Lesson     +2 mastery
Exercise   +5 mastery
Quiz       +8 mastery
Game       +3 mastery
```

Sai nhiều:

```text
-2 mastery
```

---

# SUBJECT PROGRESS

## Ngoại ngữ

Theo dõi:

```text
Vocabulary
Grammar
Speaking
Listening
Writing
```

---

## Toán học

Theo dõi:

```text
Số học
Đại số
Hình học
Xác suất
```

---

## Tiếng Việt

Theo dõi:

```text
Từ vựng
Chính tả
Ngữ pháp
Viết
```

---

# DASHBOARD

Chỉ hiển thị:

## Tiến độ tổng thể

```text
Level
XP
Streak
```

---

## Tiến độ môn học

```text
Ngoại ngữ
Toán học
Tiếng Việt
```

---

## AI đề xuất

```text
Nên học gì tiếp
```

---

# ACHIEVEMENTS

## First Lesson

```text
Hoàn thành bài đầu tiên
```

## 7 Day Streak

```text
Học liên tục 7 ngày
```

## Perfect Quiz

```text
100% điểm
```

## Vocabulary Master

```text
100 từ đúng
```

## Math Master

```text
50 bài toán đúng
```

---

# API

## Progress

```http
GET /learning/progress
```

---

## XP

```http
GET /learning/xp
```

---

## Streak

```http
GET /learning/streak
```

---

## Mastery

```http
GET /learning/mastery
```

---

# KHÔNG TRIỂN KHAI

Không làm:

* Social ranking
* NFT
* Coin system
* Energy system
* Loot box
* Daily gacha

---

# ĐỊNH NGHĨA HOÀN THÀNH

Người học có thể nhìn vào một màn hình duy nhất và biết:

```text
Tôi đang ở level nào
Tôi đã học được bao nhiêu
Tôi còn yếu phần nào
Tôi nên học gì tiếp theo
```

Khi đạt được điều này:

PROGRESS_SYSTEM_V1 = COMPLETE
