-- 企業マスタ（EDINET コードリスト由来）。投入・更新は prisma/seed.ts が行う。
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "edinetCode" TEXT,
    "corporateNumber" TEXT,
    "name" TEXT NOT NULL,
    "nameKana" TEXT,
    "searchKey" TEXT NOT NULL,
    "securitiesCode" TEXT,
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "industryLabel" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_edinetCode_key" ON "Company"("edinetCode");
CREATE INDEX "Company_searchKey_idx" ON "Company"("searchKey");
CREATE INDEX "Company_corporateNumber_idx" ON "Company"("corporateNumber");

-- 面接セッションと企業マスタの紐づけ。マスタ外の企業でも練習できるよう NULL 許容。
ALTER TABLE "InterviewSession" ADD COLUMN "companyId" TEXT;

CREATE INDEX "InterviewSession_userId_companyId_idx" ON "InterviewSession"("userId", "companyId");

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
