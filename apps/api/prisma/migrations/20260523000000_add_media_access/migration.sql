-- CreateEnum
CREATE TYPE "MediaAccess" AS ENUM ('PUBLIC', 'COURSE', 'CLASS', 'PRIVATE');

-- AlterTable
ALTER TABLE "Media"
  ADD COLUMN "access"   "MediaAccess" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "classId"  TEXT;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Media_courseId_idx" ON "Media"("courseId");

-- CreateIndex
CREATE INDEX "Media_classId_idx" ON "Media"("classId");
