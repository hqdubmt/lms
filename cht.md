# SAFE_UPDATE_ONLY.md

# MỤC TIÊU

Hệ thống AI Tutor hiện tại đã hoạt động ổn định.

Nhiệm vụ tiếp theo:

CHỈ BỔ SUNG.

KHÔNG ĐƯỢC THAY ĐỔI CODE ĐANG CHẠY.

KHÔNG ĐƯỢC REFACTOR.

KHÔNG ĐƯỢC VIẾT LẠI.

KHÔNG ĐƯỢC ĐỔI API.

KHÔNG ĐƯỢC ĐỔI DATABASE.

KHÔNG ĐƯỢC ĐỔI REDIS KEY.

KHÔNG ĐƯỢC ĐỔI SSE STREAM.

KHÔNG ĐƯỢC ĐỔI UI HIỆN TẠI.

---

# HỆ THỐNG ĐƯỢC XEM LÀ HOÀN THÀNH

## Backend

* ai-provider.ts
* orchestrator.ts
* rag.ts
* conversation-brain.ts
* learning-state.ts
* knowledge-gap.ts
* recommendation.ts
* stt.ts
* tts.ts

## Frontend

* AiChat
* ChatHeader
* MessageList
* QuizRenderer
* BrainPanel
* VoicePanel
* LangQuickBar
* Homework UI
* Dashboard UI

## API

* /ai/chat
* /ai/stt
* /ai/tts
* /ai/homework
* /ai/explain
* /ai/history
* /ai/health
* /ai/intent
* /ai/knowledge-gap
* /ai/recommendations
* /ai/learning-state

TẤT CẢ PHẢI GIỮ NGUYÊN.

---

# KHÔNG ĐƯỢC ĐỘNG VÀO

## Routing

/math
/language
/viet
/general

---

## Intent Priority

1. homework

2. quiz

3. exercise

4. tutor

Giữ nguyên.

---

## Provider Routing

Groq
↓
Gemini
↓
Ollama

Giữ nguyên.

---

## Redis

ai:brain

ai:learning

ai:chat

analytics

Giữ nguyên.

---

# CHỈ ĐƯỢC THÊM FILE MỚI

## Learning Analytics

Tạo:

services/learning-analytics.ts

Theo dõi:

* study time
* chat count
* quiz count
* homework count
* voice sessions
* mastery trend

Không sửa service cũ.

---

## Achievement System

Tạo:

services/achievement.ts

Achievements:

* FIRST_CHAT
* FIRST_QUIZ
* FIRST_HOMEWORK
* STREAK_7
* STREAK_30
* MASTERY_80
* MASTERY_100

Không sửa learning-state.

---

## Study Streak

Tạo:

services/streak.ts

Theo dõi:

* current streak
* best streak

Không sửa analytics hiện tại.

---

## Knowledge Graph Visualizer

Tạo:

services/kg-visualizer.ts

Hiển thị:

Topic
↓
Prerequisite
↓
Related Topics

Không sửa RAG.

Không sửa Qdrant.

---

## Parent Report

Tạo:

services/report-generator.ts

Xuất:

* PDF
* Markdown

Bao gồm:

* quiz
* homework
* mastery
* strengths
* weaknesses

Không sửa dashboard.

---

## Agent Monitoring

Tạo:

services/agent-monitor.ts

Theo dõi:

* Tutor Agent
* Math Agent
* Quiz Agent
* Homework Agent
* Knowledge Graph Agent

Không sửa Multi-Agent hiện tại.

---

## Cost Monitoring

Tạo:

services/provider-monitor.ts

Theo dõi:

* Groq requests
* Gemini requests
* Ollama requests
* latency
* token usage

Không sửa ai-provider.ts.

---

## Adaptive Difficulty

Tạo:

services/adaptive-engine.ts

Input:

* mastery
* mistakes
* quiz history

Output:

* easy
* medium
* hard

Không sửa quiz engine.

---

## Learning Recommendation V2

Tạo:

services/recommendation-v2.ts

Sinh:

* next lesson
* next quiz
* review topic

Không sửa recommendation.ts.

---

## Admin Analytics

API mới:

GET /ai/admin/stats

Hiển thị:

* total users
* active users
* quiz count
* homework count
* voice sessions
* token usage

Không sửa API hiện tại.

---

# FEATURE FLAG

Mọi tính năng mới phải có:

ENABLE_ANALYTICS=true

ENABLE_STREAK=true

ENABLE_ACHIEVEMENT=true

ENABLE_KNOWLEDGE_GRAPH=true

ENABLE_REPORTS=true

ENABLE_ADAPTIVE_ENGINE=true

ENABLE_AGENT_MONITOR=true

ENABLE_COST_MONITOR=true

Nếu OFF:

Không ảnh hưởng hệ thống cũ.

---

# QUY TẮC TRIỂN KHAI

1. Tạo file mới.

2. Không đổi tên hàm cũ.

3. Không đổi schema cũ.

4. Không đổi API response cũ.

5. Không đổi Redis key cũ.

6. Không đổi component cũ.

7. Không xóa code cũ.

8. Không merge logic mới vào logic cũ.

9. Logic mới phải hoạt động độc lập.

10. Tương thích ngược 100%.

---

# ĐỊNH NGHĨA THÀNH CÔNG

Sau triển khai:

✓ Chat hoạt động

✓ Quiz hoạt động

✓ Homework hoạt động

✓ Voice hoạt động

✓ Dashboard hoạt động

✓ Brain hoạt động

✓ RAG hoạt động

✓ MarkItDown hoạt động

✓ Copilot hoạt động

✓ Không regression

✓ Không mất dữ liệu

✓ Không đổi giao diện cũ

✓ Chỉ bổ sung tính năng mới

✓ Có thể deploy production ngay
