-- StudentMathProfile table
CREATE TABLE IF NOT EXISTS "StudentMathProfile" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "weakTopics"   TEXT[] NOT NULL DEFAULT '{}',
  "strongTopics" TEXT[] NOT NULL DEFAULT '{}',
  "avgScore"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastTopicType" TEXT,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentMathProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentMathProfile_userId_key" ON "StudentMathProfile"("userId");
CREATE INDEX IF NOT EXISTS "StudentMathProfile_userId_idx" ON "StudentMathProfile"("userId");
ALTER TABLE "StudentMathProfile" ADD CONSTRAINT "StudentMathProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MathImportLog table
CREATE TABLE IF NOT EXISTS "MathImportLog" (
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
  CONSTRAINT "MathImportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MathImportLog_createdBy_idx" ON "MathImportLog"("createdBy");
CREATE INDEX IF NOT EXISTS "MathImportLog_createdAt_idx" ON "MathImportLog"("createdAt");
