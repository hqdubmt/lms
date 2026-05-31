-- AddColumn synonyms and hints arrays to VocabItem
ALTER TABLE "VocabItem" ADD COLUMN IF NOT EXISTS "synonyms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "VocabItem" ADD COLUMN IF NOT EXISTS "hints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
