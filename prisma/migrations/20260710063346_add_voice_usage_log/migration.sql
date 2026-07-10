-- CreateTable
CREATE TABLE "VoiceUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceUsage_userId_createdAt_idx" ON "VoiceUsage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceUsage" ADD CONSTRAINT "VoiceUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
