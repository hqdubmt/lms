-- CreateEnum
CREATE TYPE "VietCategory" AS ENUM ('CHINH_TA', 'TU_VUNG', 'NGU_PHAP', 'THANH_NGU', 'TUC_NGU', 'VAN_HOC', 'TAP_DOC', 'CA_DAO');

-- CreateEnum
CREATE TYPE "VietExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK', 'SPELLING', 'MATCHING', 'WORD_ORDER', 'READING');

-- CreateTable
CREATE TABLE "VietSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "VietCategory" NOT NULL DEFAULT 'TU_VUNG',
    "grade" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL DEFAULT 'co_ban',
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VietSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "note" TEXT,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VietItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietItemProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReview" TIMESTAMP(3),
    "isLearned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VietItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietExercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "VietExerciseType" NOT NULL,
    "category" "VietCategory" NOT NULL DEFAULT 'TU_VUNG',
    "grade" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL DEFAULT 'co_ban',
    "passage" TEXT,
    "timeLimit" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "setId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VietExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietQuestion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VietQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "timeTaken" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VietAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VietUserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudied" TIMESTAMP(3),
    "wordsLearned" INTEGER NOT NULL DEFAULT 0,
    "exercisesDone" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VietUserStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VietSet_createdBy_idx" ON "VietSet"("createdBy");

-- CreateIndex
CREATE INDEX "VietSet_category_idx" ON "VietSet"("category");

-- CreateIndex
CREATE INDEX "VietSet_grade_idx" ON "VietSet"("grade");

-- CreateIndex
CREATE INDEX "VietItem_setId_idx" ON "VietItem"("setId");

-- CreateIndex
CREATE INDEX "VietItemProgress_userId_nextReview_idx" ON "VietItemProgress"("userId", "nextReview");

-- CreateIndex
CREATE INDEX "VietItemProgress_userId_isLearned_idx" ON "VietItemProgress"("userId", "isLearned");

-- CreateIndex
CREATE UNIQUE INDEX "VietItemProgress_userId_itemId_key" ON "VietItemProgress"("userId", "itemId");

-- CreateIndex
CREATE INDEX "VietExercise_createdBy_idx" ON "VietExercise"("createdBy");

-- CreateIndex
CREATE INDEX "VietExercise_setId_idx" ON "VietExercise"("setId");

-- CreateIndex
CREATE INDEX "VietExercise_courseId_idx" ON "VietExercise"("courseId");

-- CreateIndex
CREATE INDEX "VietQuestion_exerciseId_idx" ON "VietQuestion"("exerciseId");

-- CreateIndex
CREATE INDEX "VietAttempt_userId_idx" ON "VietAttempt"("userId");

-- CreateIndex
CREATE INDEX "VietAttempt_exerciseId_idx" ON "VietAttempt"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "VietUserStats_userId_key" ON "VietUserStats"("userId");

-- CreateIndex
CREATE INDEX "VietUserStats_xp_idx" ON "VietUserStats"("xp");

-- AddForeignKey
ALTER TABLE "VietSet" ADD CONSTRAINT "VietSet_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietSet" ADD CONSTRAINT "VietSet_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietItem" ADD CONSTRAINT "VietItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "VietSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietItemProgress" ADD CONSTRAINT "VietItemProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietItemProgress" ADD CONSTRAINT "VietItemProgress_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VietItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietExercise" ADD CONSTRAINT "VietExercise_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietExercise" ADD CONSTRAINT "VietExercise_setId_fkey" FOREIGN KEY ("setId") REFERENCES "VietSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietExercise" ADD CONSTRAINT "VietExercise_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietQuestion" ADD CONSTRAINT "VietQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "VietExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietAttempt" ADD CONSTRAINT "VietAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietAttempt" ADD CONSTRAINT "VietAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "VietExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VietUserStats" ADD CONSTRAINT "VietUserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
