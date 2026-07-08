import type { IFeedbackContextProvider } from "@/domain/feedback/ports/IFeedbackContextProvider";
import type { FeedbackQARow } from "@/domain/feedback/services/buildFeedbackContext";
import { prisma } from "@/lib/prisma";
import { AXIS_TO_DOMAIN } from "./evaluationAxisMapping";

/**
 * IFeedbackContextProvider の Prisma 実装。
 * セッションの全質問＋回答を displayOrder 昇順で取得し、軸を Prisma→ドメインへ変換する。
 */
export class PrismaFeedbackContextProvider implements IFeedbackContextProvider {
  async loadQARows(sessionId: string): Promise<FeedbackQARow[]> {
    const questions = await prisma.question.findMany({
      where: { sessionId },
      orderBy: { displayOrder: "asc" },
      select: {
        content: true,
        primaryAxis: true,
        answer: { select: { content: true } },
      },
    });

    return questions.map((q) => ({
      primaryAxis: q.primaryAxis === null ? null : AXIS_TO_DOMAIN[q.primaryAxis],
      questionText: q.content,
      answerText: q.answer?.content ?? null,
    }));
  }
}
