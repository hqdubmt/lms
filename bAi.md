# MASTER_ROADMAP.md

## PROJECT STATUS

Hệ thống hiện tại đã hoạt động ổn định.

Nguyên tắc bắt buộc:

* Không xóa tính năng đang hoạt động.
* Không thay đổi API đang được frontend sử dụng.
* Không đổi cấu trúc Redis hiện có.
* Không sửa luồng SSE đang chạy ổn định.
* Không thay đổi format metadata trả về frontend.
* Chỉ được bổ sung tính năng mới theo hướng mở rộng.
* Mọi nâng cấp phải tương thích ngược (backward compatible).

---

# SYSTEM ARCHITECTURE

Frontend

* Next.js
* React
* TypeScript
* Tailwind
* SSE Streaming

Backend

* Fastify
* TypeScript
* Redis
* Qdrant
* Groq
* Gemini
* Ollama

AI Providers

Priority:

1. Groq
2. Gemini
3. Ollama

Fallback tự động.

---

# CORE AI PIPELINE

User
→ Frontend
→ SSE Request
→ Intent Engine
→ Brain Engine
→ AI Orchestrator
→ RAG Engine
→ Response Strategy
→ Multi-Agent
→ Prompt Compiler
→ LLM Router
→ SSE Stream
→ Frontend Render
→ Async Update

Không được thay đổi pipeline này.

---

# COMPLETED MODULES

## Chatbox AI

Status: COMPLETED

Bao gồm:

* SSE Streaming
* Markdown Render
* KaTeX
* Quiz Renderer
* Suggestions
* Sources
* Copy Message
* Retry Message
* Stream Activity Strip

---

## Intent Engine

Status: COMPLETED

Priority:

1. Homework
2. Quiz
3. Exercise
4. Tutor

Không thay đổi thứ tự.

---

## Subject Routing

Status: COMPLETED

/math
/language
/viet
/general

---

## Language Intent

Status: COMPLETED

TRANSLATE
GRAMMAR
VOCABULARY
PRONUNCIATION
WRITING
LISTENING

---

## Conversation Brain

Status: COMPLETED

Redis:

ai:brain:{userId}:{subject}

Lưu:

* topic
* level
* mastery
* mistakes
* summary
* goal
* messageCount

---

## RAG Engine

Status: COMPLETED

Qdrant Vector Search

Components:

* searchConcepts()
* ragContextBlock
* ragSources

---

## Multi-Agent System

Status: COMPLETED

Agents:

* Tutor Agent
* Math Agent
* Quiz Agent
* Homework Agent
* Language Agent
* Research Agent
* Review Agent
* Knowledge Graph Agent
* Learning Coach Agent

Không được xóa agent.

---

## Knowledge Validation

Status: COMPLETED

Warnings:

* NO_MATH_FORMULA
* NO_STEPS
* ANSWER_MISSING
* TOO_SHORT

---

## Knowledge Graph

Status: COMPLETED

Redis:

kg:{userId}:{subject}

---

## Analytics

Status: COMPLETED

* Learning Events
* Timeline
* Provider Monitor
* Agent Monitor

---

## Achievement System

Status: COMPLETED

Redis:

achievement:v2:{userId}

---

## XP System

Status: COMPLETED

Redis:

xp:{userId}

---

## Streak System

Status: COMPLETED

Redis:

streak:v2:{userId}

---

# CURRENT ENDPOINTS

Không được phá vỡ API.

GET /ai/health

GET /ai/history

POST /ai/chat

POST /ai/homework

GET /ai/streak

GET /ai/achievements

GET /ai/analytics-v2

GET /ai/adaptive-v2

GET /ai/kg-viz

GET /ai/admin/stats

---

# SSE CONTRACT

Không được thay đổi.

Token:

data: {"token":"..."}

Done:

data: [DONE]

Meta:

data: {
"type":"meta",
"suggestions":[],
"sources":[],
"langIntent":null,
"activeAgents":[],
"validation":[]
}

---

# PHASE 1

VOICE LEARNING 2.0

Mục tiêu:

* Speaking Practice
* Pronunciation Analysis
* IPA Feedback
* Speaking Score

Thêm:

POST /ai/pronunciation

Response:

{
score: number,
ipa: string,
mistakes: [],
suggestions: []
}

---

# PHASE 2

ADAPTIVE LEARNING ENGINE

Mục tiêu:

* Tự điều chỉnh độ khó
* Theo dõi chủ đề yếu
* Sinh bài học tiếp theo

Thêm:

GET /ai/adaptive-session

Response:

{
weakTopics: [],
recommendedTopics: [],
difficulty: "easy|medium|hard"
}

---

# PHASE 3

KNOWLEDGE GRAPH VISUALIZATION

Mục tiêu:

* Hiển thị đồ thị kiến thức
* Quan hệ khái niệm

Frontend:

KnowledgeGraphPanel

Backend:

GET /ai/kg-viz

---

# PHASE 4

STUDY PLANNER

Mục tiêu:

* Daily Goal
* Weekly Goal
* Monthly Goal

Endpoints:

GET /ai/weekly-goals

POST /ai/weekly-goals

---

# PHASE 5

AI COPILOT

Mục tiêu:

Sinh nội dung tự động.

Modules:

* Quiz Generator
* Lesson Generator
* Homework Generator
* Exam Generator
* Study Plan Generator

---

# PHASE 6

ADVANCED ANALYTICS

Dashboard:

* Chat Count
* Quiz Count
* Homework Count
* XP Growth
* Learning Time
* Provider Usage
* Agent Usage

---

# PHASE 7

MULTI AGENT V2

Agents mới:

* Reflection Agent
* Self Correction Agent
* Critic Agent
* Planner Agent

Yêu cầu:

Agent mới chỉ bổ sung hint.

Không được thay đổi output agent cũ.

---

# PHASE 8

FULL LEARNING PLATFORM

Modules:

* Learning Path
* AI Teacher
* AI Mentor
* AI Coach
* AI Career Advisor

---

# DEPLOYMENT RULES

Mọi code mới phải:

* TypeScript strict
* Không any
* Có unit test
* Có error handling
* Có logging
* Có retry logic

---

# CLAUDE EXECUTION RULES

Khi cập nhật hệ thống:

1. Phân tích module liên quan.
2. Không sửa module ổn định.
3. Ưu tiên mở rộng bằng module mới.
4. Không đổi API contract.
5. Không đổi SSE contract.
6. Không đổi Redis schema hiện có.
7. Không phá backward compatibility.
8. Luôn cập nhật tài liệu sau khi hoàn thành.

END OF MASTER ROADMAP
