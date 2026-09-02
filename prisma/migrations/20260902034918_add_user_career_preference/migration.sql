-- AlterTable
ALTER TABLE "User" ADD COLUMN     "industryMajor" TEXT,
ADD COLUMN     "industryMinor" TEXT,
ADD COLUMN     "jobMajor" TEXT,
ADD COLUMN     "jobMinor" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);
