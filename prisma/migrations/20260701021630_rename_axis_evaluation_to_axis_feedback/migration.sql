/*
  Warnings:

  - You are about to drop the `AxisEvaluation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AxisEvaluation" DROP CONSTRAINT "AxisEvaluation_feedbackId_fkey";

-- DropTable
DROP TABLE "AxisEvaluation";

-- CreateTable
CREATE TABLE "AxisFeedback" (
    "id" TEXT NOT NULL,
    "axis" "EvaluationAxis" NOT NULL,
    "comment" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,

    CONSTRAINT "AxisFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AxisFeedback" ADD CONSTRAINT "AxisFeedback_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
