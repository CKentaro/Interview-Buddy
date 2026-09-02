-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "InterviewSession"
ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- Existing sessions that already have an end time are completed.
UPDATE "InterviewSession"
SET "status" = 'COMPLETED'
WHERE "endedAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "InterviewSession_userId_status_startedAt_idx"
ON "InterviewSession"("userId", "status", "startedAt");
