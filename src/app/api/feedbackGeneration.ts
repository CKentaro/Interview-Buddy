import { after } from "next/server";

import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import { GenerateFeedbackUseCase } from "@/application/feedback/GenerateFeedbackUseCase";
import { GeminiFeedbackService } from "@/infrastructure/ai/GeminiFeedbackService";
import { PrismaFeedbackContextProvider } from "@/infrastructure/prisma/PrismaFeedbackContextProvider";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";

/**
 * フィードバック生成をレスポンス後（`after()`）へ予約する共通処理。
 *
 * 面接完了直後（answers）と明示起動（feedback/generate）の双方から利用する。
 * 二重生成ガードは UseCase 側にあり、失敗は伝搬させずログのみ（ポーリングで failed 判定される）。
 *
 * @param feedbackRepository 既に生成済みのインスタンスがあれば渡して再利用する。
 */
export function scheduleFeedbackGeneration(
  sessionId: string,
  feedbackRepository: IFeedbackRepository = new PrismaFeedbackRepository(),
): void {
  const useCase = new GenerateFeedbackUseCase(
    new PrismaFeedbackContextProvider(),
    new GeminiFeedbackService(),
    feedbackRepository,
  );
  after(async () => {
    try {
      await useCase.execute(sessionId);
    } catch (error) {
      console.error(
        `Feedback generation failed for session ${sessionId}:`,
        error,
      );
    }
  });
}
