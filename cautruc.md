# LUỒNG TOÀN BỘ HỆ THỐNG LMS

---

## 1. KIẾN TRÚC TỔNG QUAN

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  Web (Next.js :3000) │ Desktop (Electron) │ Mobile (Capacitor)  │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTP/SSE/WebSocket
┌──────────────▼──────────────────────────────────────────────────┐
│                    API GATEWAY (Nginx)                           │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                 BACKEND — Fastify API (:4000)                    │
│  Middleware: JWT Auth │ RBAC │ Rate Limit │ Cors                 │
│  Modules: auth │ users │ courses │ lessons │ quiz                │
│           documents │ instructor │ admin │ ai                    │
│           math │ language │ viet │ forum │ notifications         │
│           media │ upload │ marketplace │ pronounce              │
└──┬───┬───┬───┬───┬──────────────────────────────────────────────┘
   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼
PostgreSQL  MongoDB  Redis  Qdrant  MinIO
(main DB)  (AI DNA)  (cache) (vector) (files)
```

---

## 2. LUỒNG XÁC THỰC (Auth Flow)

```
User → POST /auth/login (email+pass) hoặc GET /auth/google
  → JWT access token (15m) + refresh token (7d) → Redis lưu session
  → Frontend lưu token → gắn vào mọi request header
  → Token hết hạn → POST /auth/refresh → access token mới
```

**Roles:** `ADMIN` → `INSTRUCTOR` → `STUDENT`

---

## 3. LUỒNG LMS CỐT LÕI (M1)

```
ADMIN:
  Tạo Course → Chapter → Lesson (text/video/quiz)
  Tạo Class → Gán học sinh → Assign course

INSTRUCTOR:
  Quản lý lớp, học sinh, bài tập, điểm
  Xem analytics lớp, chủ đề yếu của HS

STUDENT:
  Enroll khóa học → Học lesson → Làm quiz → Xem điểm
  Dashboard: progress, streak, XP, achievements
```

---

## 4. LUỒNG DOCUMENT PIPELINE (M2)

```
Upload file (PDF/DOCX/PPTX/XLSX/HTML/TXT)
  → MinIO lưu file gốc
  → Queue xử lý:
      MarkItDown → cleanMarkdown
      → detectSubject (Toán/Tiếng Anh/Tiếng Việt)
      → qualityCheck
      → chunk (đoạn nhỏ)
      → embed (vector)
      → Qdrant lưu vector
  → PostgreSQL lưu metadata
  → Sẵn sàng cho RAG search
```

---

## 5. LUỒNG AI CHATBOX — CORE FLOW (M4)

```
Student gửi message (text hoặc voice)
  │
  ▼
[Intent Engine] — phát hiện mode:
  homework / quiz / exercise / tutor (default)
  └─ Language intents: translate/grammar/vocab/speaking/writing/pronunciation
  │
  ▼
[RAG Search] — tìm context liên quan từ Qdrant
  (score ≥ 0.45 mới dùng)
  │
  ▼
[Conversation Brain] — Redis
  - Lịch sử 20 tin nhắn gần nhất (TTL 7 ngày)
  - Mastery map (chủ đề đã học)
  - Lỗi sai thường gặp
  │
  ▼
[Adaptive Engine] — xác định độ khó phù hợp
  │
  ▼
[Response Strategy] — chọn chiến lược trả lời
  │
  ▼
[Multi-Agent Pipeline]:
  ├─ reflectionAgent    — kiểm tra lịch sử, tránh lặp
  ├─ selfCorrectionAgent— kiểm tra misconceptions môn học
  ├─ criticAgent        — đảm bảo chất lượng theo mode
  ├─ plannerAgent       — gợi ý học path tiếp theo
  └─ learningDnaAgent   — cá nhân hóa theo DNA học tập
  │
  ▼
[AI Provider — failover]:
  Groq (llama-3.3) → Gemini (flash) → Ollama (local)
  │
  ▼
[Response Validator] — kiểm tra output
  │
  ▼
SSE stream → Client (real-time typing effect)
  │
  ▼
[Post-processing]:
  - updateBrain (cập nhật mastery, lỗi sai)
  - trackLearningEvent (analytics)
  - recordActiveDay (streak)
  - awardXP (gamification)
  - checkAndUnlockAchievements
  - recordProviderCall / recordAgentCall (monitoring)
  - recordTimelineEvent (learning timeline)
```

---

## 6. LUỒNG AI COPILOT — GIÁO VIÊN (M3)

```
Instructor upload tài liệu
  → POST /instructor/copilot/generate
  → Đọc nội dung markdown
  → SSE stream: AI sinh ra
      ├─ Quiz (JSON + markdown)
      ├─ Lesson Plan
      ├─ Exam
      ├─ Answer Key
      └─ Worksheet
  → Export / dùng trực tiếp
```

---

## 7. LUỒNG CÁC MODULE MÔN HỌC

```
TOÁN (Math):
  Topic → Exercise → AI giải từng bước → Grade → Review
  Math Pipeline: LaTeX rendering, step-by-step solution
  Games: Speed Math, Formula Hunt, Math Boss Battle, Adventure Map

TIẾNG ANH (Language):
  Vocab → Flashcard → Pronunciation (Whisper STT + TTS)
  IELTS Coach → AI Conversation → Exercise → Review
  Games: Vocabulary Hunter, Sentence Builder, Pronunciation Challenge
  Leaderboard, Analytics, Folder system

TIẾNG VIỆT (Viet):
  Set từ vựng → Exercise → Chính Tả → Review
  Games: Chính Tả Thần Tốc, Ghép Từ, Săn Thành Ngữ, Nhà Văn Nhí
  Leaderboard, Analytics
```

---

## 8. LUỒNG GAMIFICATION

```
Câu đúng → +10 XP
Streak 5 câu → +20 XP bonus
Streak 10 câu → +50 XP bonus
Perfect round → +100 XP

XP tích lũy → Level up (Beginner → Explorer → Scholar → Master → Legend)

Achievements unlock → badges theo môn học
Leaderboard: cập nhật real-time (Redis sorted set)

GAME MODES:
  ├─ Battle Quiz — multiplayer real-time (WebSocket)
  ├─ Guild — nhóm học tập, cộng điểm
  └─ Leaderboard Pro — bảng xếp hạng toàn trường
```

---

## 9. LUỒNG AI LEARNING PLATFORM (8 Phases)

```
/learning/path       → AI vẽ lộ trình học (review→lesson→quiz→practice→milestone)
/learning/teacher    → AI Teacher: input topic → sinh bài giảng có cấu trúc (SSE)
/learning/mentor     → AI Mentor: motivation, milestones, weekly goal
/learning/career     → Career Advisor: match mastery → career roadmap
/learning/knowledge-graph → Visualize knowledge graph
/analytics           → XP growth, provider usage, agent usage stats
/learning/profile    → Learning DNA profile
/learning/revision   → Spaced repetition
/learning/report-card → Báo cáo học tập tổng hợp
/learning/timeline   → Timeline sự kiện học tập
/learning/coach      → AI Coach cá nhân
```

---

## 10. LUỒNG MONITORING & OBSERVABILITY (M6)

```
API calls → metrics.ts → Prometheus (:9090)
                       → Grafana (:3001) — dashboards
Logs      → Loki + Promtail — log aggregation

Provider Monitor:
  Mỗi Groq/Gemini/Ollama call → recordProviderCall → MongoDB
  → /admin/ai-analytics: tỉ lệ dùng, latency, errors

Agent Monitor:
  Mỗi agent call → recordAgentCall → MongoDB
  → Xem hiệu quả từng agent
```

---

## 11. LUỒNG ENTERPRISE & MARKETPLACE

```
MARKETPLACE:
  Instructor submit khóa học → Admin duyệt → Published
  Student mua → VNPay payment → Enrollment
  Instructor xem earnings

ENTERPRISE (/admin/enterprise):
  KPI tổng hợp: users, revenue, courses
  Analytics users/courses toàn hệ thống
  Class management
```

---

## 12. INFRASTRUCTURE STACK

```
┌────────────────────────────────────────────┐
│              Docker Compose                 │
│  ├─ api (Fastify :4000)                    │
│  ├─ web (Next.js :3000)                    │
│  ├─ postgres (:5432) — main data           │
│  ├─ mongodb (:27017) — AI feedback/DNA     │
│  ├─ redis (:6379) — cache/sessions/brain   │
│  ├─ qdrant (:6333) — vector search         │
│  ├─ minio (:9000) — file storage           │
│  ├─ nginx (:80/:443) — reverse proxy       │
│  ├─ prometheus (:9090) — metrics           │
│  ├─ grafana (:3001) — dashboards           │
│  └─ loki + promtail — log aggregation      │
└────────────────────────────────────────────┘

AI Providers (external):
  Groq API (llama-3.3-70b) — primary
  Google Gemini (flash) — fallback
  Ollama (local) — offline fallback
  Whisper — Speech-to-Text
  TTS — Text-to-Speech
```

---

## 13. MODULE MAP TỔNG HỢP

| Module | Backend | Frontend | DB |
|--------|---------|----------|----|
| Auth | auth.routes | /login, /register | PostgreSQL + Redis |
| LMS Core | courses, lessons, quiz | /dashboard, /courses, /learn | PostgreSQL |
| Document | documents, upload | /admin/documents | PostgreSQL + MinIO + Qdrant |
| AI Chatbox | ai.routes (core) | /dashboard (chatbox) | Redis + MongoDB + Qdrant |
| AI Copilot | ai/copilot | /instructor/copilot, /admin/copilot | — |
| Math | math.routes | /math/\* | PostgreSQL + MinIO |
| Language | language.routes | /language/\* | PostgreSQL |
| Viet | viet.routes | /viet/\* | PostgreSQL |
| Gamification | xp-gamification | /leaderboard, /game/\* | Redis + PostgreSQL |
| Analytics | analytics.routes | /analytics, /learning/\* | MongoDB + PostgreSQL |
| Marketplace | marketplace.routes | /marketplace | PostgreSQL |
| Enterprise | enterprise.routes | /admin/enterprise | PostgreSQL |
| Monitoring | metrics.routes | /admin/ai-analytics | MongoDB + Prometheus |
