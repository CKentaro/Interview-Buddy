CREATE TYPE "InterviewLength" AS ENUM ('SHORT', 'STANDARD', 'LONG');

ALTER TABLE "InterviewSession"
ADD COLUMN "interviewLength" "InterviewLength" NOT NULL DEFAULT 'STANDARD';
