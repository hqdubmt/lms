-- CreateEnum
CREATE TYPE "AnnouncementTopic" AS ENUM ('SYSTEM', 'COURSE', 'CLASS', 'EVENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK');

-- CreateTable: Announcement
CREATE TABLE "Announcement" (
  "id"        TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "topic"     "AnnouncementTopic" NOT NULL DEFAULT 'GENERAL',
  "authorId"  TEXT NOT NULL,
  "courseId"  TEXT,
  "classId"   TEXT,
  "isPinned"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AnnouncementRead
CREATE TABLE "AnnouncementRead" (
  "announcementId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "readAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId", "userId")
);

-- CreateTable: ForumCategory
CREATE TABLE "ForumCategory" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "icon"        TEXT,
  "color"       TEXT DEFAULT '#6366f1',
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForumPost
CREATE TABLE "ForumPost" (
  "id"         TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "isPinned"   BOOLEAN NOT NULL DEFAULT false,
  "isClosed"   BOOLEAN NOT NULL DEFAULT false,
  "views"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForumReply
CREATE TABLE "ForumReply" (
  "id"        TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ForumLike
CREATE TABLE "ForumLike" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "postId"    TEXT,
  "replyId"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForumLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QuizSet
CREATE TABLE "QuizSet" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "topic"       TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "isPublic"    BOOLEAN NOT NULL DEFAULT true,
  "timeLimit"   INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QuizQuestion
CREATE TABLE "QuizQuestion" (
  "id"           TEXT NOT NULL,
  "quizSetId"    TEXT NOT NULL,
  "question"     TEXT NOT NULL,
  "type"         "QuizQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
  "options"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "correctText"  TEXT,
  "explanation"  TEXT,
  "order"        INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: QuizAttempt
CREATE TABLE "QuizAttempt" (
  "id"        TEXT NOT NULL,
  "quizSetId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "score"     INTEGER NOT NULL,
  "answers"   JSONB NOT NULL,
  "timeTaken" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- ForeignKeys: Announcement
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForeignKeys: AnnouncementRead
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKeys: ForumPost
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ForeignKeys: ForumReply
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ForeignKeys: ForumLike
ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_replyId_fkey"
  FOREIGN KEY ("replyId") REFERENCES "ForumReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKeys: QuizSet
ALTER TABLE "QuizSet" ADD CONSTRAINT "QuizSet_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ForeignKeys: QuizQuestion
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizSetId_fkey"
  FOREIGN KEY ("quizSetId") REFERENCES "QuizSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ForeignKeys: QuizAttempt
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizSetId_fkey"
  FOREIGN KEY ("quizSetId") REFERENCES "QuizSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes: Announcement
CREATE INDEX "Announcement_authorId_idx"         ON "Announcement"("authorId");
CREATE INDEX "Announcement_topic_idx"            ON "Announcement"("topic");
CREATE INDEX "Announcement_courseId_idx"         ON "Announcement"("courseId");
CREATE INDEX "Announcement_classId_idx"          ON "Announcement"("classId");
CREATE INDEX "Announcement_isPinned_createdAt_idx" ON "Announcement"("isPinned", "createdAt");
CREATE INDEX "AnnouncementRead_userId_idx"       ON "AnnouncementRead"("userId");

-- Indexes: Forum
CREATE INDEX "ForumCategory_order_idx"           ON "ForumCategory"("order");
CREATE INDEX "ForumPost_categoryId_idx"          ON "ForumPost"("categoryId");
CREATE INDEX "ForumPost_authorId_idx"            ON "ForumPost"("authorId");
CREATE INDEX "ForumPost_createdAt_idx"           ON "ForumPost"("createdAt");
CREATE INDEX "ForumPost_isPinned_createdAt_idx"  ON "ForumPost"("isPinned", "createdAt");
CREATE INDEX "ForumReply_postId_idx"             ON "ForumReply"("postId");
CREATE INDEX "ForumReply_authorId_idx"           ON "ForumReply"("authorId");
CREATE UNIQUE INDEX "ForumLike_userId_postId_key"  ON "ForumLike"("userId", "postId") WHERE "postId" IS NOT NULL;
CREATE UNIQUE INDEX "ForumLike_userId_replyId_key" ON "ForumLike"("userId", "replyId") WHERE "replyId" IS NOT NULL;
CREATE INDEX "ForumLike_postId_idx"              ON "ForumLike"("postId");
CREATE INDEX "ForumLike_replyId_idx"             ON "ForumLike"("replyId");

-- Indexes: Quiz
CREATE INDEX "QuizSet_authorId_idx"              ON "QuizSet"("authorId");
CREATE INDEX "QuizSet_topic_idx"                 ON "QuizSet"("topic");
CREATE INDEX "QuizSet_isPublic_idx"              ON "QuizSet"("isPublic");
CREATE INDEX "QuizQuestion_quizSetId_idx"        ON "QuizQuestion"("quizSetId");
CREATE INDEX "QuizAttempt_quizSetId_idx"         ON "QuizAttempt"("quizSetId");
CREATE INDEX "QuizAttempt_userId_idx"            ON "QuizAttempt"("userId");
CREATE INDEX "QuizAttempt_quizSetId_score_idx"   ON "QuizAttempt"("quizSetId", "score");
