# GAME_SYSTEM_V2.md

## Trạng thái

```text
V1 — HOÀN THÀNH (Phase 1-2)
V2 — HOÀN THÀNH (Phase 3: Boss Battle, AI Conversation, Adventure Map)
V3 — ĐANG CHẠY (Phase 4: Battle Quiz, Guild, Leaderboard Pro)
```

---

## Triết lý

Game không phải tính năng riêng.

Game là một phần của Learning Flow.

```text
Lesson
 ↓
Exercise
 ↓
AI Explain
 ↓
Game
 ↓
Mastery
```

Game phải:

* Học được
* Chơi nhanh (3-5 phút)
* Tăng ghi nhớ kiến thức
* Cập nhật Mastery sau khi chơi

Không xây MMORPG. Không xây metaverse.

---

# GAME HUB

Đường dẫn:

```text
/game
```

3 nhóm môn học + 1 nhóm cộng đồng:

```text
Ngoại ngữ
Toán học
Tiếng Việt
Cộng đồng & Đấu trường
```

---

# PHASE 1 — Cơ bản (DONE)

## Vocabulary Hunter — Ngoại ngữ

```text
Đọc nghĩa tiếng Việt
 ↓
Chọn từ tiếng Anh đúng
 ↓
+10 XP / lượt
```

Route: `/language/game/vocab-hunter`

---

## Speed Math — Toán học

```text
60 giây
 ↓
Giải nhiều phép tính nhất
 ↓
+10 XP / phép đúng
```

Route: `/math/game/speed-math`

---

## Chính Tả Thần Tốc — Tiếng Việt

```text
Nghe câu TTS
 ↓
Gõ lại chính xác
 ↓
+10 XP / câu đúng
```

Route: `/viet/game/chinh-ta`

---

# PHASE 2 — Nâng cao (DONE)

## Pronunciation Challenge — Ngoại ngữ

Pipeline:

```text
AI cho câu mẫu
 ↓
User ghi âm
 ↓
Whisper STT
 ↓
AI chấm điểm phát âm
 ↓
+20 XP
```

Route: `/language/game/pronunciation-challenge`

---

## Sentence Builder — Ngoại ngữ

```text
Kéo thả từ rời
 ↓
Tạo câu đúng ngữ pháp
 ↓
+15 XP
```

Route: `/language/game/sentence-builder`

---

## Formula Hunt — Toán học

```text
Hiện tên khái niệm / bài toán
 ↓
Chọn công thức đúng
 ↓
+15 XP
```

Route: `/math/game/formula-hunt`

---

## Nhà Văn Nhí — Tiếng Việt

```text
AI cho chủ đề
 ↓
User viết đoạn văn
 ↓
AI chấm: chính tả + ngữ pháp + diễn đạt
 ↓
+20 XP
```

Route: `/viet/game/nhan-van-nhi`

---

## Ghép Từ — Tiếng Việt

```text
Hiện nghĩa hoặc gợi ý
 ↓
Ghép các từ/vần thành từ đúng
 ↓
+15 XP
```

Route: `/viet/game/ghep-tu`

---

# PHASE 3 — Boss & AI (DONE)

## Math Boss Battle — Toán học

```text
Chọn Boss theo chủ đề
 ↓
10 câu hỏi — mỗi câu đúng đánh Boss
 ↓
Hạ Boss → nhận XP thưởng
 ↓
+50 XP nếu thắng
```

Boss HP: 100. Mỗi câu đúng → -10 HP Boss.

Route: `/math/game/boss-battle`

---

## AI Conversation — Ngoại ngữ

```text
Chọn vai (giáo viên / người bán hàng / khách du lịch...)
 ↓
Hội thoại bằng text hoặc giọng nói
 ↓
AI đánh giá: fluency + accuracy + naturalness
 ↓
+XP theo hiệu suất
```

Route: `/language/game/ai-conversation`

---

## Adventure Map — Toán học

```text
Bản đồ học tập theo chương / lớp
 ↓
Giải đúng → mở ô tiếp theo
 ↓
Hoàn thành chương → mở map mới
```

Route: `/math/game/adventure`

---

# PHASE 4 — Cộng đồng (ĐANG CHẠY)

## Battle Quiz

```text
Thách đấu bạn bè realtime
 ↓
10 câu tốc độ
 ↓
Thắng → +80 XP
```

Route: `/game/battle`

Kỹ thuật: WebSocket / SSE.

---

## Guild

```text
Tạo hoặc tham gia guild
 ↓
Học → đóng góp XP cho guild
 ↓
Guild leo bảng Guild Leaderboard
```

Route: `/game/guild`

---

## Leaderboard Pro

```text
Xếp hạng theo từng môn:
- Toán học
- Ngoại ngữ
- Tiếng Việt
- Guild (tổng hợp)
```

Route: `/leaderboard`

---

# XP SYSTEM

```text
Trả lời đúng        +10 XP
Câu khó             +15–20 XP
Perfect Round       +25 XP
Streak ×5           +20 XP bonus
Streak ×10          +50 XP bonus
Boss Battle thắng   +50 XP
Battle Quiz thắng   +80 XP
```

---

# LEVEL SYSTEM

```text
Level 1–10    Beginner
Level 11–20   Explorer
Level 21–30   Scholar
Level 31–50   Master
Level 50+     Legend
```

---

# MASTERY UPDATE

Mỗi game cập nhật mastery sau khi chơi:

```json
{
  "subject": "language",
  "topic": "vocabulary",
  "masteryDelta": 3
}
```

---

# GAME REWARD

Hiển thị sau mỗi ván:

```text
+XP
+Mastery
+Streak
```

Không dùng tiền ảo. Không dùng NFT. Không dùng vật phẩm.

---

# DASHBOARD INTEGRATION

Dashboard hiển thị:

```text
Tiếp tục học
Bài tập cần làm
AI đề xuất
Tiến độ học tập
```

Game nằm trong mục **Luyện tập** — không đặt ở trang chủ.

---

# VIỆC CẦN LÀM — PHASE 4

Backend:

* [ ] WebSocket room cho Battle Quiz
* [ ] Guild CRUD + XP contribution API
* [ ] Leaderboard query theo môn + period (week/month/all)

Frontend:

* [ ] Battle Quiz: lobby → countdown → câu hỏi realtime → kết quả
* [ ] Guild: trang thành viên, bảng điểm guild, chat đơn giản
* [ ] Leaderboard Pro: tab theo môn, top 10, rank cá nhân

---

# ĐỊNH NGHĨA HOÀN THÀNH — V2

Mỗi môn có đủ 3+ game hoạt động.

Người học hoàn thành:

```text
Học bài
 ↓
Làm bài tập
 ↓
AI giải thích
 ↓
Chơi game
 ↓
Nhận XP + cập nhật Mastery
```

Phase 4 hoàn thành khi Battle Quiz + Guild + Leaderboard Pro hoạt động end-to-end.
