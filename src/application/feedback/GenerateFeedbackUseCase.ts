import type { IFeedbackContextProvider } from "@/domain/feedback/ports/IFeedbackContextProvider";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import type { IFeedbackService } from "@/domain/feedback/ports/IFeedbackService";
import { buildFeedbackContext } from "@/domain/feedback/services/buildFeedbackContext";

/**
 * フィードバック生成のユースケース（application/feedback）。
 *
 * 面接完了（Phase 3-2 の complete）と明示 POST の両方から、いずれも `after()` 経由の
 * 非同期処理として起動される。以下を満たす:
 * - 二重生成ガード: 既に Feedback があれば何もしない（after の多重起動対策も兼ねる）。
 * - 部分保存しない: 生成（軸別4＋総評）が 1 つでも失敗すれば save に到達しない。
 */
export class GenerateFeedbackUseCase {
  constructor(
    private readonly contextProvider: IFeedbackContextProvider,
    private readonly feedbackService: IFeedbackService,
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async execute(sessionId: string): Promise<void> {
    // 二重生成ガード。
    const existing = await this.feedbackRepository.findBySessionId(sessionId);
    if (existing !== null) {
      return;
    }

    const rows = await this.contextProvider.loadQARows(sessionId);
    const context = buildFeedbackContext(rows);

    // 軸別4＋総評を生成。1つでも失敗すれば例外が伝搬し、以降の save は実行されない。
    const generated = await this.feedbackService.generate(context);

    // 全成功時のみ保存（Feedback＋AxisFeedback を 1 まとめに）。
    await this.feedbackRepository.save({
      sessionId,
      overallComment: generated.overallComment,
      axisFeedbacks: generated.axisFeedbacks.map((a) => ({
        axis: a.axis,
        comment: a.comment,
      })),
    });
  }
}
