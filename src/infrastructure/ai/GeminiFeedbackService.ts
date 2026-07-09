import { generateText, Output } from "ai";
import { z } from "zod";
import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type {
  FeedbackGenerationContext,
  FeedbackQAPair,
  GeneratedAxisFeedback,
  GeneratedFeedback,
  IFeedbackService,
} from "@/domain/feedback/ports/IFeedbackService";
import {
  buildAxisEvaluationPrompt,
  buildOverallCommentPrompt,
} from "./feedbackPrompts";
import { geminiModel } from "./geminiModel";

const axisEvaluationSchema = z.object({ comment: z.string() });
const overallCommentSchema = z.object({ overallComment: z.string() });

type GeminiModel = ReturnType<typeof geminiModel>;

/**
 * IFeedbackService の Gemini 実装。
 *
 * 軸別評価×4 と総評を Vercel AI SDK（@ai-sdk/google）で並行生成する。
 * Promise.all を使うため、1 つでも失敗すれば全体が reject し、呼び出し元
 * （GenerateFeedbackUseCase）は保存を行わない（部分保存しない）。
 */
export class GeminiFeedbackService implements IFeedbackService {
  async generate(
    context: FeedbackGenerationContext,
  ): Promise<GeneratedFeedback> {
    const model = geminiModel();

    // 総評＋4軸を並行生成。1つでも失敗したら Promise.all が reject（= 何も保存されない）。
    const [overallComment, ...axisFeedbacks] = await Promise.all([
      this.generateOverall(model, context.allQAPairs),
      ...context.axisQAPairs.map(({ axis, pairs }) =>
        this.generateAxis(model, axis, pairs),
      ),
    ]);

    return { overallComment, axisFeedbacks };
  }

  private async generateAxis(
    model: GeminiModel,
    axis: EvaluationAxis,
    pairs: FeedbackQAPair[],
  ): Promise<GeneratedAxisFeedback> {
    const result = await generateText({
      model,
      output: Output.object({ schema: axisEvaluationSchema }),
      prompt: buildAxisEvaluationPrompt(axis, pairs),
    });
    return { axis, comment: result.output.comment };
  }

  private async generateOverall(
    model: GeminiModel,
    pairs: FeedbackQAPair[],
  ): Promise<string> {
    const result = await generateText({
      model,
      output: Output.object({ schema: overallCommentSchema }),
      prompt: buildOverallCommentPrompt(pairs),
    });
    return result.output.overallComment;
  }
}
