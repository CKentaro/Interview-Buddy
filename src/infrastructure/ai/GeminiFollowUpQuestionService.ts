import type {
  FollowUpGenerationContext,
  GeneratedFollowUpQuestion,
  IFollowUpQuestionService,
} from "@/domain/interview/ports/IFollowUpQuestionService";

/**
 * IFollowUpQuestionService の Gemini 実装（骨格）。
 *
 * NOTE: 実際の Gemini 呼び出しは未実装。Google AI SDK の導入とプロンプト設計が
 * 入ったタイミングで generate() の中身を実装する。差込口（型）だけ確定させ、
 * アプリケーション層はこのクラスではなくインターフェースに依存している。
 */
export class GeminiFollowUpQuestionService implements IFollowUpQuestionService {
  async generate(
    context: FollowUpGenerationContext,
  ): Promise<GeneratedFollowUpQuestion> {
    void context; // 実装時に使用する。骨格では未使用を明示。
    throw new Error(
      "GeminiFollowUpQuestionService.generate is not implemented yet",
    );
  }
}
