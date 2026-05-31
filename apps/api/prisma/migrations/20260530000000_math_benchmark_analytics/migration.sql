-- Add droppedByQualityGate + avgParserScore to MathImportLog
ALTER TABLE "MathImportLog"
  ADD COLUMN IF NOT EXISTS "droppedByQualityGate" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "avgParserScore"        DOUBLE PRECISION NOT NULL DEFAULT 0;

-- MathBenchmark table (toantiep.md Giai đoạn 6)
CREATE TABLE IF NOT EXISTS "MathBenchmark" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "totalFiles"  INTEGER NOT NULL DEFAULT 0,
  "parseOk"     INTEGER NOT NULL DEFAULT 0,
  "jsonValid"   INTEGER NOT NULL DEFAULT 0,
  "qualityPass" INTEGER NOT NULL DEFAULT 0,
  "hallucCount" INTEGER NOT NULL DEFAULT 0,
  "avgQuality"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgParser"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"       TEXT,
  "createdBy"   TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MathBenchmark_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MathBenchmark_createdBy_idx" ON "MathBenchmark"("createdBy");
CREATE INDEX IF NOT EXISTS "MathBenchmark_createdAt_idx" ON "MathBenchmark"("createdAt");
