-- Add new MathSubject enum values
ALTER TYPE "MathSubject" ADD VALUE IF NOT EXISTS 'MEASUREMENT';
ALTER TYPE "MathSubject" ADD VALUE IF NOT EXISTS 'WORD_PROBLEM';
ALTER TYPE "MathSubject" ADD VALUE IF NOT EXISTS 'LOGIC';

-- Add lessonType and textbook fields to MathTopic
ALTER TABLE "MathTopic" ADD COLUMN IF NOT EXISTS "lessonType" TEXT;
ALTER TABLE "MathTopic" ADD COLUMN IF NOT EXISTS "textbook" TEXT;
