-- CreateEnum
CREATE TYPE "MathSubject" AS ENUM ('ARITHMETIC', 'ALGEBRA', 'GEOMETRY', 'TRIGONOMETRY', 'CALCULUS', 'STATISTICS', 'NUMBER_THEORY', 'COMBINATORICS');

-- CreateEnum
CREATE TYPE "MathExerciseType" AS ENUM ('MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'CALCULATION', 'PROOF_STEP');

-- CreateTable
CREATE TABLE "MathTopic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" "MathSubject" NOT NULL DEFAULT 'ARITHMETIC',
    "grade" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "coverUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MathTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathConcept" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "formula" TEXT,
    "example" TEXT,
    "solution" TEXT,
    "hints" TEXT[],
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MathConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReview" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReview" TIMESTAMP(3),
    "isLearned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConceptProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathExercise" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MathExerciseType" NOT NULL,
    "subject" "MathSubject" NOT NULL DEFAULT 'ARITHMETIC',
    "grade" INTEGER NOT NULL DEFAULT 1,
    "level" TEXT NOT NULL DEFAULT 'beginner',
    "timeLimit" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "topicId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MathExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathQuestion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "options" JSONB,
    "answer" JSONB NOT NULL,
    "solution" TEXT,
    "hints" TEXT[],
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MathQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "timeTaken" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MathAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathUserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudied" TIMESTAMP(3),
    "conceptsLearned" INTEGER NOT NULL DEFAULT 0,
    "exercisesDone" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MathUserStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MathTopic_createdBy_idx" ON "MathTopic"("createdBy");

-- CreateIndex
CREATE INDEX "MathTopic_subject_idx" ON "MathTopic"("subject");

-- CreateIndex
CREATE INDEX "MathTopic_grade_idx" ON "MathTopic"("grade");

-- CreateIndex
CREATE INDEX "MathConcept_topicId_idx" ON "MathConcept"("topicId");

-- CreateIndex
CREATE INDEX "ConceptProgress_userId_nextReview_idx" ON "ConceptProgress"("userId", "nextReview");

-- CreateIndex
CREATE INDEX "ConceptProgress_userId_isLearned_idx" ON "ConceptProgress"("userId", "isLearned");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptProgress_userId_conceptId_key" ON "ConceptProgress"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "MathExercise_createdBy_idx" ON "MathExercise"("createdBy");

-- CreateIndex
CREATE INDEX "MathExercise_topicId_idx" ON "MathExercise"("topicId");

-- CreateIndex
CREATE INDEX "MathExercise_courseId_idx" ON "MathExercise"("courseId");

-- CreateIndex
CREATE INDEX "MathQuestion_exerciseId_idx" ON "MathQuestion"("exerciseId");

-- CreateIndex
CREATE INDEX "MathAttempt_userId_idx" ON "MathAttempt"("userId");

-- CreateIndex
CREATE INDEX "MathAttempt_exerciseId_idx" ON "MathAttempt"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "MathUserStats_userId_key" ON "MathUserStats"("userId");

-- CreateIndex
CREATE INDEX "MathUserStats_xp_idx" ON "MathUserStats"("xp");

-- AddForeignKey
ALTER TABLE "MathTopic" ADD CONSTRAINT "MathTopic_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathTopic" ADD CONSTRAINT "MathTopic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathConcept" ADD CONSTRAINT "MathConcept_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "MathTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptProgress" ADD CONSTRAINT "ConceptProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptProgress" ADD CONSTRAINT "ConceptProgress_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "MathConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathExercise" ADD CONSTRAINT "MathExercise_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathExercise" ADD CONSTRAINT "MathExercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "MathTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathExercise" ADD CONSTRAINT "MathExercise_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathQuestion" ADD CONSTRAINT "MathQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "MathExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathAttempt" ADD CONSTRAINT "MathAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathAttempt" ADD CONSTRAINT "MathAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "MathExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathUserStats" ADD CONSTRAINT "MathUserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
