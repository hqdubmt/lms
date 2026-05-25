-- VocabSet tree structure: add parentId for parent-child hierarchy
ALTER TABLE "VocabSet" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- LangExercise: link to vocabSet for exercises inside a set
ALTER TABLE "LangExercise" ADD COLUMN IF NOT EXISTS "vocabSetId" TEXT;

-- ForumCategory: add isHidden for soft-hide
ALTER TABLE "ForumCategory" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- ForumPost: add isHidden for soft-hide
ALTER TABLE "ForumPost" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey: VocabSet self-relation (tree)
ALTER TABLE "VocabSet" DROP CONSTRAINT IF EXISTS "VocabSet_parentId_fkey";
ALTER TABLE "VocabSet" ADD CONSTRAINT "VocabSet_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "VocabSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LangExercise -> VocabSet
ALTER TABLE "LangExercise" DROP CONSTRAINT IF EXISTS "LangExercise_vocabSetId_fkey";
ALTER TABLE "LangExercise" ADD CONSTRAINT "LangExercise_vocabSetId_fkey"
  FOREIGN KEY ("vocabSetId") REFERENCES "VocabSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex for parentId
CREATE INDEX IF NOT EXISTS "VocabSet_parentId_idx" ON "VocabSet"("parentId");

-- CreateIndex for vocabSetId
CREATE INDEX IF NOT EXISTS "LangExercise_vocabSetId_idx" ON "LangExercise"("vocabSetId");

-- CreateIndex for ForumCategory isHidden
CREATE INDEX IF NOT EXISTS "ForumCategory_isHidden_idx" ON "ForumCategory"("isHidden");

-- CreateIndex for ForumPost isHidden
CREATE INDEX IF NOT EXISTS "ForumPost_isHidden_idx" ON "ForumPost"("isHidden");
