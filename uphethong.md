# SYSTEM_MASTER_ROADMAP.md

# AI LEARNING PLATFORM - MASTER ROADMAP

Version: 1.0

---

# VISION

Xây dựng nền tảng học tập AI thế hệ mới có khả năng:

* Tự động tạo khóa học
* Trợ giảng AI cá nhân
* Chấm bài AI
* Học thích ứng
* Tạo Knowledge Graph
* Theo dõi năng lực học tập
* Gamification
* Voice Learning
* LMS hoàn chỉnh
* Multi-Agent AI System

---

# SYSTEM ARCHITECTURE

```text
Student
    ↓
Frontend Web/App
    ↓
API Gateway
    ↓
Core Services
    ├── Authentication
    ├── Course Service
    ├── AI Service
    ├── Learning Service
    ├── Analytics Service
    └── Gamification Service
    ↓
Data Layer
    ├── PostgreSQL
    ├── Redis
    ├── Qdrant
    ├── MinIO
    └── Ollama
```

---

# MODULE 1 - AUTHENTICATION

## Features

* Login
* Register
* JWT
* Refresh Token
* Google Login
* Role Based Access

## Roles

```text
Student
Teacher
Admin
Super Admin
```

---

# MODULE 2 - COURSE MANAGEMENT

## Course

```text
Course
 ├── Chapter
 ├── Lesson
 ├── Quiz
 ├── Homework
 └── Resources
```

## Features

* Create Course
* Edit Course
* Publish Course
* Draft Mode
* Clone Course
* Import Course

---

# MODULE 3 - DOCUMENT INGESTION

## Upload Sources

```text
PDF
DOCX
PPTX
TXT
HTML
Markdown
YouTube Transcript
```

## Pipeline

```text
Upload
 ↓
MinIO
 ↓
MarkItDown
 ↓
Chunking
 ↓
Embedding
 ↓
Qdrant
```

Output

```text
Knowledge Base
```

---

# MODULE 4 - AI COURSE GENERATOR

## Input

```text
Topic
Level
Target Audience
Duration
Language
```

## Output

```text
Course
 Chapters
 Lessons
 Quiz
 Homework
 Flashcards
```

---

# MODULE 5 - AI CHATBOX

Components

```text
Intent Engine
Brain Memory
RAG
Multi-Agent
Prompt Compiler
LLM Router
SSE Stream
```

Providers

```text
Groq
Gemini
Ollama
```

Capabilities

```text
Tutor
Quiz
Homework
Adaptive Learning
Voice Learning
```

---

# MODULE 6 - HOMEWORK GRADING

Input

```text
Essay
Answer Sheet
Uploaded File
```

Output

```json
{
  "score": 8,
  "rubric": [],
  "mistakes": [],
  "suggestions": []
}
```

Features

* AI Grading
* Rubric
* Feedback
* Weakness Analysis

---

# MODULE 7 - QUIZ ENGINE

Types

```text
Multiple Choice
True False
Fill Blank
Matching
Essay
```

Features

```text
Auto Generate
Auto Grade
Adaptive Quiz
Difficulty Scaling
```

---

# MODULE 8 - LEARNING BRAIN

Redis

```text
ai:brain:{userId}:{subject}
```

Store

```text
Level
Mastery
Mistakes
Goals
Summary
Weak Topics
Strong Topics
```

Purpose

```text
Long-term Learning Memory
```

---

# MODULE 9 - KNOWLEDGE GRAPH

Store

```text
Concepts
Relationships
Prerequisites
Mastery
```

Features

```text
Learning Map
Weak Topic Detection
Recommendation Engine
```

---

# MODULE 10 - ADAPTIVE LEARNING

Analyze

```text
Mastery
Quiz Score
Homework Score
Knowledge Graph
```

Generate

```text
Personalized Lessons
Personalized Quiz
Personalized Roadmap
```

---

# MODULE 11 - GAMIFICATION

Features

```text
XP
Level
Achievements
Badges
Streak
Leaderboard
```

XP Sources

```text
Chat
Quiz
Homework
Course Completion
Daily Activity
```

---

# MODULE 12 - ANALYTICS

Track

```text
Study Time
Quiz Results
Completion Rate
AI Usage
Learning Progress
```

Dashboards

```text
Student Dashboard
Teacher Dashboard
Admin Dashboard
```

---

# MODULE 13 - VOICE LEARNING

Input

```text
Web Speech API
Whisper STT
```

Output

```text
Speech Synthesis
```

Modes

```text
Conversation
Pronunciation
Listening Practice
```

---

# MODULE 14 - MULTI AGENT SYSTEM

Core Agents

```text
Tutor Agent
Math Agent
Language Agent
Quiz Agent
Homework Agent
Research Agent
Review Agent
Learning Coach Agent
Knowledge Graph Agent
```

Advanced Agents

```text
Planner Agent
Reflection Agent
Critic Agent
Career Agent
Motivation Agent
```

---

# MODULE 15 - ADMIN PANEL

Features

```text
User Management
Course Management
Document Management
Provider Monitoring
System Monitoring
Analytics
```

---

# INFRASTRUCTURE

Frontend

```text
React
TypeScript
Tailwind
```

Backend

```text
NodeJS
Fastify
```

Database

```text
PostgreSQL
Redis
Qdrant
MinIO
```

AI

```text
Groq
Gemini
Ollama
```

Deployment

```text
Docker
Docker Compose
Ubuntu Server
Nginx
Cloudflare
Tailscale
```

---

# IMPLEMENTATION ROADMAP

PHASE 1

* Authentication
* Chatbox
* Groq
* Gemini

PHASE 2

* Redis Brain
* History
* SSE Streaming

PHASE 3

* Document Upload
* MinIO
* Qdrant
* RAG

PHASE 4

* Homework Grading
* Quiz Engine

PHASE 5

* AI Course Generator

PHASE 6

* Knowledge Graph

PHASE 7

* Adaptive Learning

PHASE 8

* Multi-Agent

PHASE 9

* XP + Achievement + Streak

PHASE 10

* Voice Learning

PHASE 11

* Analytics Dashboard

PHASE 12

* Production Optimization

---

# FINAL GOAL

```text
AI Learning Platform
      +
Personal AI Tutor
      +
Knowledge Graph
      +
Adaptive Learning
      +
Gamification
      +
Voice Assistant
      +
Course Generator
      =
Next Generation LMS
```
