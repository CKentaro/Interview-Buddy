import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  FollowUpGenerationContext,
  GeneratedFollowUpQuestion,
  IFollowUpQuestionService,
} from "@/domain/interview/ports/IFollowUpQuestionService";
import { buildFollowUpPrompt } from "./followUpPrompts";
import { geminiModel } from "./geminiModel";

const followUpSchema = z.object({
  displayText: z.string(),
  speechText: z.string(),
});

/**
 * IFollowUpQuestionService の Gemini 実装（Vercel AI SDK / 構造化出力）。
 * プロンプトは {@link ./followUpPrompts} に集約する。
 */
export class GeminiFollowUpQuestionService implements IFollowUpQuestionService {
  async generate(
    context: FollowUpGenerationContext,
  ): Promise<GeneratedFollowUpQuestion> {
    const result = await generateText({
      model: geminiModel(),
      output: Output.object({ schema: followUpSchema }),
      prompt: buildFollowUpPrompt(context),
    });
    return result.output;
  }
}
