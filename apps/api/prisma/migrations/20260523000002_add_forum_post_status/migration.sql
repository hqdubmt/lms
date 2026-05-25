-- CreateEnum
CREATE TYPE "ForumPostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ForumPost"
  ADD COLUMN "status" "ForumPostStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "ForumPost_status_idx" ON "ForumPost"("status");
