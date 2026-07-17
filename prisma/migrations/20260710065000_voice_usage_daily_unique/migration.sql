-- AlterTable
ALTER TABLE "VoiceUsage" ADD COLUMN "usageDate" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VoiceUsage_userId_usageDate_key" ON "VoiceUsage"("userId", "usageDate");
