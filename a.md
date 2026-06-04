# AI CHATBOX - CONTINUOUS DEVELOPMENT RULES

## MỤC TIÊU

Tiếp tục phát triển AI Learning Platform hiện tại.

Hệ thống đang hoạt động ổn định.

Ưu tiên:

* Bổ sung tính năng mới
* Mở rộng module
* Tăng trải nghiệm học tập
* Tăng khả năng theo dõi và phân tích

KHÔNG refactor lớn.

KHÔNG phá luồng hiện tại.

---

# KHÔNG ĐƯỢC THAY ĐỔI

## Chat Core

* POST /ai/chat
* SSE Streaming
* useChatStream
* aiChatStream
* Intent Engine
* Subject Detection

## AI Core

* Conversation Brain
* Learning State
* Knowledge Gap
* Recommendation Engine
* Multi-Agent System
* Orchestrator

## RAG

* MarkItDown Pipeline
* Embedding Pipeline
* Qdrant
* searchConcepts()

## AI Routing

* Groq
* Gemini
* Ollama

Fallback:

Groq → Gemini → Ollama

## Voice

* Browser STT
* Whisper STT
* Browser TTS
* Voice Tutor

---

# KIẾN TRÚC HIỆN TẠI PHẢI GIỮ NGUYÊN

User
→ Frontend
→ SSE Request
→ Intent Engine
→ Brain
→ Orchestrator
→ RAG
→ Multi-Agent
→ LLM Router
→ SSE Response
→ Async Updates
→ Redis

Không thay đổi thứ tự này.

---

# TÍNH NĂNG ĐÃ HOÀN THÀNH

✓ Quiz Engine 2.0

✓ Homework Engine 2.0

✓ Learning State

✓ Knowledge Graph

✓ Achievement

✓ Streak

✓ XP

✓ Timeline

✓ Dashboard

✓ Voice Tutor

✓ Copilot

✓ MarkItDown

✓ Multi-Agent

✓ Adaptive Learning

---

# ƯU TIÊN PHÁT TRIỂN TIẾP

## P1 - Learning Analytics

Thêm:

GET /ai/analytics/mastery

GET /ai/analytics/progress

GET /ai/analytics/trends

UI:

* Mastery Chart
* Progress Chart
* Learning Trend

---

## P2 - Study Coach

Thêm:

GET /ai/study-plan

GET /ai/weekly-goals

GET /ai/monthly-goals

AI tự đề xuất lộ trình học.

---

## P3 - Knowledge Graph UI

Frontend:

KnowledgeGraphViewer

KnowledgeGraphSearch

KnowledgeGraphFilters

Dùng dữ liệu hiện có.

Không sửa backend KG.

---

## P4 - Gamification

Thêm:

* Daily Quest
* Weekly Quest
* XP Progress
* Rank
* Level

Không sửa achievement hiện tại.

---

## P5 - Admin Monitoring

Thêm:

GET /ai/admin/providers

GET /ai/admin/agents

GET /ai/admin/rag

GET /ai/admin/usage

Hiển thị:

* Usage
* Latency
* Error Rate
* RAG Hit Rate

---

## P6 - Copilot 2.0

Mở rộng:

* Lesson Generator
* Worksheet Generator
* Exam Generator
* Answer Generator
* Study Guide Generator

Sử dụng markdown từ MarkItDown.

---

# NGUYÊN TẮC PHÁT TRIỂN

1. Additive Only

Chỉ thêm.

Không xóa.

Không thay đổi luồng cũ.

---

2. Backward Compatible

Code mới phải chạy cùng code cũ.

---

3. Service Isolation

Mỗi module mới:

* service riêng
* endpoint riêng
* redis key riêng

---

4. Async First

Các module mới phải chạy async.

Không làm chậm SSE.

---

# KẾT QUẢ CUỐI CÙNG

Hệ thống trở thành:

AI Tutor Platform

bao gồm:

* AI Chat
* AI Quiz
* AI Homework
* AI Voice Tutor
* AI Study Coach
* AI Analytics
* AI Knowledge Graph
* AI Dashboard
* AI Gamification
* AI Copilot

Mọi nâng cấp phải giữ nguyên toàn bộ chức năng hiện tại.
