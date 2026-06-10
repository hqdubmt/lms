# SYSTEM_STANDARD_V1.md

# TẦM NHÌN HỆ THỐNG

Xây dựng nền tảng học tập AI tập trung cho:

* Ngoại ngữ
* Toán học
* Tiếng Việt

Mục tiêu:

* Học dễ
* Học nhanh
* Học vui
* Cá nhân hóa bằng AI

Không biến hệ thống thành một LMS quá phức tạp.

---

# NGUYÊN TẮC THIẾT KẾ

Mọi tính năng phải trả lời ít nhất một trong ba câu hỏi:

1. Giúp học hiệu quả hơn?
2. Giúp học nhanh hơn?
3. Giúp học thú vị hơn?

Nếu không:

→ Không đưa ra giao diện chính.

---

# KIẾN TRÚC ƯU TIÊN

## Tầng 1 — Học tập

* Lesson
* Quiz
* Homework
* AI Tutor
* Games

Đây là tầng quan trọng nhất.

---

## Tầng 2 — Cá nhân hóa

* Brain
* Adaptive Learning
* Learning DNA
* Study Plan
* Mastery

---

## Tầng 3 — Quản trị

* Documents
* Copilot
* Analytics
* Monitoring
* Marketplace

Ẩn khỏi học sinh.

---

# MENU CHÍNH

## Student

🏠 Trang chủ

📚 Học tập

🤖 AI Gia sư

🎮 Luyện tập

📈 Tiến bộ

⚙️ Cá nhân

---

## Instructor

Dashboard

Lớp học

Khóa học

Copilot

Báo cáo

---

## Admin

Documents

AI Analytics

Providers

Agents

System

Marketplace

---

# BA MÔN HỌC CHÍNH

## Ngoại ngữ

Các trụ cột:

* Vocabulary
* Grammar
* Listening
* Speaking
* Reading
* Writing

Game:

* Vocabulary Hunter
* Sentence Builder
* Pronunciation Challenge

---

## Toán học

Các trụ cột:

* Đại số
* Hình học
* Thống kê
* Xác suất

Game:

* Speed Math
* Formula Hunt
* Math Adventure

---

## Tiếng Việt

Các trụ cột:

* Chính tả
* Từ vựng
* Ngữ pháp
* Tập làm văn

Game:

* Chính Tả Thần Tốc
* Ghép Từ
* Nhà Văn Nhí

---

# AI CHATBOX CHUẨN

User
↓
Intent Engine
↓
Brain
↓
RAG
↓
Adaptive
↓
Agent Layer
↓
LLM Router
↓
Validation
↓
SSE Stream
↓
Update Brain

---

# AGENT CHUẨN

Chỉ dùng 4 Agent.

## Tutor Agent

Giải thích kiến thức.

## Review Agent

Phát hiện lỗi sai.

## Planning Agent

Gợi ý bước học tiếp.

## Language Agent

Chỉ cho môn ngoại ngữ.

Không thêm agent mới nếu chưa thật sự cần.

---

# BRAIN MODEL

Lưu:

topic

mastery

mistakes

goal

level

messageCount

Không lưu dữ liệu dư thừa.

---

# DASHBOARD CHUẨN

Chỉ hiển thị:

1. Tiếp tục học
2. Hôm nay học gì
3. Bài tập cần làm
4. AI đề xuất
5. Tiến độ học tập

Không hiển thị:

* metrics kỹ thuật
* provider monitor
* agent monitor
* analytics phức tạp

---

# TIẾN BỘ HỌC TẬP

Hiển thị:

XP

Level

Streak

Mastery

Roadmap

Không quá nhiều biểu đồ.

---

# GAMIFICATION

Giữ:

XP

Level

Achievement

Streak

Bỏ khỏi giai đoạn hiện tại:

Guild

Battle Realtime

School Ranking

Marketplace Rewards

---

# MÀU SẮC

Toán:
#7C3AED

Ngoại ngữ:
#2563EB

Tiếng Việt:
#DC2626

AI:
#14B8A6

Success:
#22C55E

Warning:
#F59E0B

Error:
#EF4444

---

# PROVIDER STRATEGY

Primary:
Groq

Fallback:
Gemini

Offline:
Ollama

Nguyên tắc:

Ưu tiên tốc độ trước.

---

# RAG STRATEGY

Chỉ dùng khi:

score >= 0.45

Không ép RAG mọi câu hỏi.

---

# QUY TẮC PHÁT TRIỂN

Không thêm:

* môn học mới
* database mới
* agent mới
* dashboard mới

Cho đến khi:

Ngoại ngữ hoàn thiện

Toán hoàn thiện

Tiếng Việt hoàn thiện

---

# FLOW HỌC TẬP CHUẨN

Học bài
↓
Làm bài tập
↓
Hỏi AI
↓
Chơi game
↓
Ôn tập
↓
Cập nhật mastery
↓
Mở khóa thành tích

---

# ĐỊNH NGHĨA HOÀN THIỆN V1

Một học sinh có thể:

* Học bài
* Hỏi AI
* Làm bài tập
* Luyện tập bằng game
* Theo dõi tiến độ

mà không cần hướng dẫn sử dụng.

Nếu đạt được điều này:

=> Hệ thống đạt chuẩn V1.
