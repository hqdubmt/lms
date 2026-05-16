# MasterLMS - Quickstart

## Yêu cầu
- Node.js >= 20
- Docker & Docker Compose
- npm / yarn

## 1. Cài đặt dependencies

```bash
cd /root/quangdu/lms
npm install
```

## 2. Cấu hình environment

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local

# Deploy
cp deploy/backend/.env.example deploy/backend/.env
cp deploy/frontend/.env.example deploy/frontend/.env
```

## 3. Chạy services (Docker)

```bash
cd deploy
docker compose up -d postgres mongodb redis minio
```

## 4. Database migration & seed

```bash
cd apps/api
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

## 5. Chạy development

```bash
# Terminal 1 - API
cd apps/api && npm run dev

# Terminal 2 - Web
cd apps/web && npm run dev
```

## 6. Tài khoản mặc định (sau seed)

| Role       | Email                     | Password         |
|------------|---------------------------|------------------|
| Admin      | admin@masterlms.com       | Admin@123456     |
| Instructor | instructor@masterlms.com  | Instructor@123456|

## 7. Deploy production

```bash
cd deploy
cp backend/.env.example backend/.env   # edit values
cp frontend/.env.example frontend/.env # edit values
docker compose up -d
```

## Cấu trúc dự án

```
lms/
├── apps/
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/  # auth, users, courses, lessons, todo, upload
│   │   │   ├── services/ # prisma, redis, mongo, minio, mail
│   │   │   ├── websocket/# Socket.IO
│   │   │   ├── queues/   # BullMQ queues
│   │   │   └── workers/  # BullMQ workers
│   │   └── prisma/       # Schema + migrations
│   └── web/              # Next.js 15 frontend
│       └── src/
│           ├── app/      # App Router pages
│           ├── components/
│           ├── stores/   # Zustand
│           └── lib/      # API client, utils
└── deploy/               # Docker Compose + configs
```

## API Endpoints chính

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me

GET  /courses
GET  /courses/:slug
POST /courses           (instructor)
POST /courses/:id/enroll

GET  /lessons/:id
PATCH /lessons/:id/progress

GET  /users/enrollments
GET  /todos
POST /todos

WebSocket: ws://localhost:4000 (Socket.IO)
```
