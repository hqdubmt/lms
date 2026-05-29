-- Add lessonType and textbook to VietSet
ALTER TABLE "VietSet" ADD COLUMN IF NOT EXISTS "lessonType" TEXT;
ALTER TABLE "VietSet" ADD COLUMN IF NOT EXISTS "textbook" TEXT;

-- StudentVietProfile
CREATE TABLE IF NOT EXISTS "StudentVietProfile" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "weakTopics"   TEXT[] NOT NULL DEFAULT '{}',
  "strongTopics" TEXT[] NOT NULL DEFAULT '{}',
  "avgScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastTopicType" TEXT,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentVietProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentVietProfile_userId_key" ON "StudentVietProfile"("userId");
CREATE INDEX IF NOT EXISTS "StudentVietProfile_userId_idx" ON "StudentVietProfile"("userId");
ALTER TABLE "StudentVietProfile" ADD CONSTRAINT "StudentVietProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VietImportLog
CREATE TABLE IF NOT EXISTS "VietImportLog" (
  "id"                 TEXT NOT NULL,
  "documentId"         TEXT,
  "totalLessons"       INTEGER NOT NULL DEFAULT 0,
  "validLessons"       INTEGER NOT NULL DEFAULT 0,
  "hallucinationCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount"     INTEGER NOT NULL DEFAULT 0,
  "repairCount"        INTEGER NOT NULL DEFAULT 0,
  "retryTotal"         INTEGER NOT NULL DEFAULT 0,
  "avgQualityScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "textbook"           TEXT,
  "grade"              INTEGER,
  "createdBy"          TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VietImportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VietImportLog_createdBy_idx" ON "VietImportLog"("createdBy");
CREATE INDEX IF NOT EXISTS "VietImportLog_createdAt_idx" ON "VietImportLog"("createdAt");
