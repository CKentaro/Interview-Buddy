import { generateText, Output } from "ai";
import { z } from "zod";
import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
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
 * 軸別評価×4 を Vercel AI SDK（@ai-sdk/google）で並行生成し、その結果を
 * 総評プロンプトへ渡して総評を生成する（軸別と総評の指摘の重複を避けるため逐次）。
 * 1 つでも失敗すれば全体が reject し、呼び出し元（GenerateFeedbackUseCase）は
 * 保存を行わない（部分保存しない）。
 */
export class GeminiFeedbackService implements IFeedbackService {
  async generate(
    context: FeedbackGenerationContext,
  ): Promise<GeneratedFeedback> {
    const model = geminiModel();

    // 4軸を並行生成。1つでも失敗したら Promise.all が reject（= 何も保存されない）。
    const axisFeedbacks = await Promise.all(
      context.axisQAPairs.map(({ axis, pairs }) =>
        this.generateAxis(model, axis, pairs, context.interviewerType),
      ),
    );

    // 総評は軸別の結果を参照して生成する（既出の指摘を繰り返させない）。
    const overallComment = await this.generateOverall(
      model,
      context.allQAPairs,
      axisFeedbacks,
      context.interviewerType,
    );

    return { overallComment, axisFeedbacks };
  }

  private async generateAxis(
    model: GeminiModel,
    axis: EvaluationAxis,
    pairs: FeedbackQAPair[],
    interviewerType: InterviewerType,
  ): Promise<GeneratedAxisFeedback> {
    const result = await generateText({
      model,
      output: Output.object({ schema: axisEvaluationSchema }),
      prompt: buildAxisEvaluationPrompt(axis, pairs, interviewerType),
    });
    return { axis, comment: result.output.comment };
  }

  private async generateOverall(
    model: GeminiModel,
    pairs: FeedbackQAPair[],
    axisFeedbacks: GeneratedAxisFeedback[],
    interviewerType: InterviewerType,
  ): Promise<string> {
    const result = await generateText({
      model,
      output: Output.object({ schema: overallCommentSchema }),
      prompt: buildOverallCommentPrompt(pairs, axisFeedbacks, interviewerType),
    });
    return result.output.overallComment;
  }
}
