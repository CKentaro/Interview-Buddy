import type {
  FeedbackGenerationContext,
  GeneratedFeedback,
  IFeedbackService,
} from "@/domain/feedback/ports/IFeedbackService";

/**
 * IFeedbackService の Gemini 実装（骨格）。
 *
 * NOTE: 実際の Gemini 呼び出しは未実装。Google AI SDK の導入とプロンプト設計が
 * 入ったタイミングで generate() の中身（軸別評価・総評の生成）を実装する。
 * 差込口（型）だけ確定させ、アプリケーション層はこのクラスではなくインターフェースに依存する。
 */
export class GeminiFeedbackService implements IFeedbackService {
  async generate(
    context: FeedbackGenerationContext,
  ): Promise<GeneratedFeedback> {
    void context; // 実装時に使用する。骨格では未使用を明示。
    throw new Error("GeminiFeedbackService.generate is not implemented yet");
  }
}
