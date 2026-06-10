# NON_BREAKING_OPTIMIZATION_PLAN.md

## Mục tiêu

Tối ưu toàn bộ LMS mà KHÔNG ảnh hưởng code đang chạy.

Nguyên tắc:

* Không refactor lớn
* Không đổi API hiện tại
* Không đổi database schema
* Không xóa module cũ
* Không ảnh hưởng production

---

# PHASE 1 — CHATBOX SIMPLIFICATION

## Hiện tại

Intent
→ Brain
→ RAG
→ Adaptive
→ 9-13 Agents
→ Provider Router

## Mục tiêu

Intent
→ Brain
→ RAG
→ Adaptive
→ Core Agents
→ Provider Router

---

## Không xóa agent

Chỉ thêm config:

config/ai-agents.ts

```ts
export const ENABLED_AGENTS = [
  "tutor",
  "review",
  "planner",
  "language"
];
```

Agent cũ vẫn tồn tại.

Chỉ không được gọi.

---

# PHASE 2 — FEATURE FLAGS

Tạo:

```ts
featureFlags.ts
```

```ts
export const FEATURES = {
  LEGACY_AI_PANELS: false,
  LEGACY_KNOWLEDGE_MAP: false,
  LEGACY_AI_TEACHER: false,
  LEGACY_AI_MENTOR: false,
  LEGACY_CAREER_ADVISOR: false
}
```

UI cũ vẫn còn code.

Chỉ ẩn khỏi menu.

---

# PHASE 3 — LEARNING FLOW V2

Tạo layer mới.

Không sửa lesson cũ.

Thêm:

```text
LearningFlowService
```

Quyết định:

Lesson
↓
Exercise
↓
AI Explain
↓
Game
↓
Progress

---

Code cũ vẫn hoạt động.

---

# PHASE 4 — GAME HUB

Tạo:

/games

Bên trong:

Ngoại ngữ

* Vocabulary Hunter
* Sentence Builder
* Pronunciation Challenge

Toán

* Speed Math
* Formula Hunt
* Math Adventure

Tiếng Việt

* Chính Tả Thần Tốc
* Ghép Từ
* Nhà Văn Nhí

Không đụng code LMS.

---

# PHASE 5 — BRAIN V2

Brain hiện tại giữ nguyên.

Tạo thêm:

```ts
BrainLite
```

Chỉ dùng:

```ts
{
  topic,
  mastery,
  mistakes,
  level,
  goal
}
```

Nếu BrainLite lỗi:

Fallback Brain cũ.

---

# PHASE 6 — DASHBOARD V2

Tạo:

dashboard-v2

Không sửa dashboard hiện tại.

Sau khi ổn định:

```ts
FEATURE_NEW_DASHBOARD=true
```

Mới chuyển.

---

# PHASE 7 — PROVIDER OPTIMIZATION

Giữ nguyên:

Groq
→ Gemini
→ Ollama

Chỉ thêm:

```ts
ProviderSelector
```

Quy tắc:

* Chat ngắn → Groq
* Chat dài → Gemini
* Offline → Ollama

Không đổi API.

---

# PHASE 8 — CLEANUP

Sau khi chạy ổn định 30 ngày:

* Kiểm tra log
* Kiểm tra usage

Nếu module nào không còn dùng:

Đánh dấu deprecated.

KHÔNG xóa ngay.

---

# TUYỆT ĐỐI KHÔNG LÀM

❌ Đổi database

❌ Đổi Redis keys

❌ Đổi API routes

❌ Đổi SSE contract

❌ Đổi auth

❌ Đổi upload pipeline

❌ Đổi document pipeline

❌ Đổi RAG schema

---

# KẾT QUẢ

Sau tối ưu:

* UI đơn giản hơn
* Chatbox nhanh hơn
* Ít token hơn
* Dễ bảo trì hơn

Trong khi:

* Code cũ vẫn chạy
* Production an toàn
* Có thể rollback bất cứ lúc nào
