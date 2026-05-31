-- Add topic and itemLevel to VocabItem
ALTER TABLE "VocabItem" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "VocabItem" ADD COLUMN IF NOT EXISTS "itemLevel" TEXT;
CREATE INDEX IF NOT EXISTS "VocabItem_topic_idx" ON "VocabItem"("topic");

-- Add speakScore and listenScore to VocabItemProgress
ALTER TABLE "VocabItemProgress" ADD COLUMN IF NOT EXISTS "speakScore" DOUBLE PRECISION;
ALTER TABLE "VocabItemProgress" ADD COLUMN IF NOT EXISTS "listenScore" DOUBLE PRECISION;

-- Create LangSkillScore table
CREATE TABLE IF NOT EXISTS "LangSkillScore" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "skill"     TEXT NOT NULL,
  "score"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sessions"  INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LangSkillScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LangSkillScore_userId_skill_key" ON "LangSkillScore"("userId", "skill");
CREATE INDEX IF NOT EXISTS "LangSkillScore_userId_idx" ON "LangSkillScore"("userId");

ALTER TABLE "LangSkillScore" DROP CONSTRAINT IF EXISTS "LangSkillScore_userId_fkey";
ALTER TABLE "LangSkillScore" ADD CONSTRAINT "LangSkillScore_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
