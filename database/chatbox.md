# AI_TUTOR_MASTER_SPEC.md

# VERSION

v1.0 Production

---

# MISSION

AI Tutor là trung tâm của LMS.

Mục tiêu:

* Trả lời câu hỏi học sinh
* Dựa trên giáo trình đã upload
* Tạo bài tập
* Giải thích kiến thức
* Chấm bài
* Hướng dẫn từng bước
* Hỗ trợ giọng nói

---

# SYSTEM ARCHITECTURE

```txt
Student
   ↓
AI Chat UI
   ↓
API Gateway
   ↓
RAG Engine
   ↓
Model Router
   ↓
AI Provider
   ↓
Response Stream
```

---

# CHAT FLOW

```txt
User Question
↓
Detect Subject
↓
Retrieve Context
↓
Build Prompt
↓
Call AI
↓
Stream Response
↓
Save History
```

---

# SUBJECTS

```txt
math
viet
language
general
```

---

# AI MODES

## 1. Tutor Mode

Giải thích kiến thức.

Ví dụ:

```txt
Định lý Pythagoras là gì?
```

---

## 2. Exercise Mode

Sinh bài tập.

Ví dụ:

```txt
Cho em 10 bài tập phép chia.
```

---

## 3. Homework Mode

Chấm bài.

Ví dụ:

```txt
Đây là bài làm của em.
```

---

## 4. Quiz Mode

Sinh quiz nhanh.

Ví dụ:

```txt
Kiểm tra em về danh từ.
```

---

# MESSAGE SCHEMA

```json
{
  "role": "user",
  "content": "Định lý Pythagoras là gì?"
}
```

---

# CHAT REQUEST

```json
{
  "messages": [],
  "subject": "math"
}
```

---

# CHAT RESPONSE

```json
{
  "answer": "",
  "sources": [],
  "suggestions": []
}
```

---

# STREAMING

Protocol:

SSE

```txt
data: {"token":"Xin"}

data: {"token":" chào"}

data: [DONE]
```

---

# TYPING INDICATOR

Frontend:

```txt
AI đang suy nghĩ...
● ● ●
```

Hiển thị:

* trước token đầu tiên

Ẩn:

* khi nhận token đầu tiên

---

# RAG ENGINE

## Sources

```txt
Lessons
Topics
Exercises
Flashcards
```

---

## Retrieval

```txt
Question
↓
Embedding
↓
Vector Search
↓
Top 5 Documents
↓
Prompt
```

---

## Response Format

```json
{
  "answer": "...",
  "sources": [
    {
      "lesson": "Bài 1",
      "topic": "Phép cộng"
    }
  ]
}
```

---

# SOURCE DISPLAY

Luôn hiển thị:

```txt
Nguồn:

✓ Bài 1
✓ Chủ đề Phép cộng
```

---

# SUGGESTED QUESTIONS

Sau mỗi câu trả lời:

```json
{
  "suggestions": [
    "Cho em ví dụ",
    "Cho em bài tập",
    "Giải thích đơn giản hơn"
  ]
}
```

---

# TUTOR ACTIONS

AI có thể trả về action.

## Generate Exercise

```json
{
  "action": "generate_exercise"
}
```

---

## Generate Quiz

```json
{
  "action": "generate_quiz"
}
```

---

## Explain Topic

```json
{
  "action": "explain_topic"
}
```

---

# HOMEWORK ASSISTANT

Input:

```txt
Text
Image
PDF
```

---

Workflow

```txt
Homework
↓
OCR
↓
AI Review
↓
Score
↓
Feedback
```

---

Output

```json
{
  "score": 90,
  "feedback": "Làm tốt",
  "mistakes": []
}
```

---

# VOICE AI

Pipeline

```txt
Mic
↓
Speech To Text
↓
AI Tutor
↓
Text To Speech
↓
Speaker
```

---

# SPEECH TO TEXT

Preferred:

```txt
faster-whisper
```

Fallback:

```txt
browser speech recognition
```

---

# TEXT TO SPEECH

Preferred:

```txt
Piper TTS
```

---

# VOICE CONVERSATION

Flow

```txt
Student speaks
↓
STT
↓
AI Tutor
↓
TTS
↓
AI speaks
```

---

# CONVERSATION MEMORY

Store

```txt
Last 20 messages
```

Maximum

```txt
20 messages
4000 chars/message
```

---

# MODEL ROUTER

Priority

```txt
1. Groq
2. Gemini
3. Ollama
```

---

# FALLBACK

```txt
Groq Fail
↓
Gemini

Gemini Fail
↓
Ollama
```

---

# AI PROVIDERS

## Groq

Primary

```txt
llama-3.3-70b
```

---

## Gemini

Fallback

```txt
gemini-2.0-flash
```

---

## Ollama

Local

Recommended:

```txt
qwen3:8b
```

or

```txt
llama3.1:8b
```

---

# ANALYTICS

Track

```txt
Questions
Answers
Tokens
Latency
Provider
```

---

# SAFETY

Block

```txt
Prompt Injection
Jailbreak
Spam
Malware
```

---

# FRONTEND FEATURES

## Chat

✓ Streaming

✓ Markdown

✓ Math Formula

✓ Code Block

✓ Copy Message

---

## Voice

✓ Mic

✓ Stop Recording

✓ Replay Audio

---

## UX

✓ Typing Indicator

✓ Suggested Questions

✓ Source References

✓ Retry Button

✓ Stop Generation

---

# API ENDPOINTS

## Chat

```txt
POST /api/ai/chat
```

---

## STT

```txt
POST /api/ai/stt
```

---

## TTS

```txt
POST /api/ai/tts
```

---

## Explain

```txt
POST /api/ai/explain
```

---

## Homework

```txt
POST /api/ai/homework
```

---

## Health

```txt
GET /api/ai/health
```

---

# MVP CHECKLIST

✓ Streaming Chat

✓ RAG

✓ Source Display

✓ Suggested Questions

✓ Exercise Generation

✓ Quiz Generation

✓ Homework Assistant

✓ STT

✓ TTS

✓ Voice Conversation

✓ Provider Fallback

✓ Analytics

END
