# PHASE_2_FOCUS_ROADMAP.md

## Mục tiêu

Sau khi hoàn thành chuẩn hóa UI/UX V1, hệ thống chuyển sang giai đoạn:

> Tập trung nâng cao trải nghiệm học tập thay vì mở rộng tính năng.

---

# TRẠNG THÁI HIỆN TẠI

## Đã hoàn thành

### UI/UX

* Chuẩn hóa Student Navigation
* Chuẩn hóa Instructor Navigation
* Chuẩn hóa Admin Navigation
* Chuẩn hóa Mobile Navigation
* Chuẩn hóa Dashboard
* Chuẩn hóa màu sắc 3 môn

### Học tập

* Ngoại ngữ
* Toán học
* Tiếng Việt

### AI

* AI Chatbox
* RAG
* Brain
* Adaptive Learning
* Multi-Agent

---

# KHÔNG PHÁT TRIỂN THÊM

Cho đến khi V1 hoàn thiện:

❌ Không thêm môn học mới

❌ Không thêm database mới

❌ Không thêm dashboard mới

❌ Không thêm AI agent mới

❌ Không thêm marketplace features

❌ Không thêm enterprise features

---

# ƯU TIÊN 1

## Chuẩn hóa AI Chatbox

Kiến trúc mục tiêu:

User
↓
Intent
↓
Brain
↓
RAG
↓
Adaptive
↓
4 Agents
↓
Provider Router
↓
Validation
↓
SSE

---

## Chỉ giữ 4 Agent

### Tutor Agent

Giải thích kiến thức.

---

### Review Agent

Phân tích lỗi sai.

---

### Planning Agent

Đề xuất bước học tiếp.

---

### Language Agent

Chỉ cho ngoại ngữ.

---

## Loại bỏ

reflectionAgent

criticAgent

selfCorrectionAgent

knowledgeGraphAgent

researchAgent

learningDNAAgent

(nếu không thật sự cần thiết)

---

# ƯU TIÊN 2

## Chuẩn hóa Learning Flow

Tất cả môn học phải theo cùng một luồng:

Bài học
↓
Bài tập
↓
AI giải thích
↓
Game luyện tập
↓
Mastery tăng
↓
Tiến độ cập nhật

---

# ƯU TIÊN 3

## Hoàn thiện Game Learning

### Ngoại ngữ

Vocabulary Hunter

Sentence Builder

Pronunciation Challenge

---

### Toán học

Speed Math

Formula Hunt

Math Adventure

---

### Tiếng Việt

Chính Tả Thần Tốc

Ghép Từ

Nhà Văn Nhí

---

## Nguyên tắc

Không tạo thêm game mới.

Hoàn thiện 9 game hiện có.

---

# ƯU TIÊN 4

## Tối giản Brain

Chỉ lưu:

topic

mastery

mistakes

level

goal

messageCount

---

Không lưu dữ liệu dư thừa.

---

# ƯU TIÊN 5

## Tiến độ học tập

Chỉ giữ:

XP

Level

Streak

Mastery

Roadmap

---

Không xây thêm dashboard analytics phức tạp.

---

# MỤC TIÊU V1

Một học sinh mới có thể:

* Học bài
* Làm bài tập
* Hỏi AI
* Chơi game
* Theo dõi tiến độ

mà không cần tài liệu hướng dẫn.

---

# ĐỊNH NGHĨA HOÀN THIỆN

V1 được xem là hoàn thiện khi:

* 3 môn hoạt động ổn định
* AI Chatbox ổn định
* Game hoạt động tốt
* Progress tracking ổn định
* UX đơn giản và dễ hiểu

---

# THỨ TỰ TRIỂN KHAI

1. Chuẩn hóa AI Chatbox

2. Hoàn thiện Learning Flow

3. Hoàn thiện Game Learning

4. Tối giản Brain

5. Tối ưu Progress Tracking

6. Kiểm thử toàn hệ thống

7. Release V1
