import { generateText, Output } from "ai";
import { z } from "zod";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";
import type {
  FollowUpGenerationContext,
  GeneratedFollowUpQuestion,
  IFollowUpQuestionService,
} from "@/domain/interview/ports/IFollowUpQuestionService";
import { geminiModel } from "./geminiModel";

const followUpSchema = z.object({
  displayText: z.string(),
  speechText: z.string(),
});

function buildFollowUpPrompt(context: FollowUpGenerationContext): string {
  const axis = EVALUATION_AXIS_METADATA[context.axis];
  const history = context.conversationHistory
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText ?? "（未回答）"}`)
    .join("\n\n");

  return `あなたは就職面接の面接官です。
以下の評価軸に沿って、応募者への深掘り質問を1つ生成してください。

## 評価軸
- 軸名: ${axis.label}
- 意味: ${axis.description}

## 本質問
${context.parentMainQuestionText}

## これまでのやり取り
${history}

## 指示
- 直前の回答が曖昧なら、具体化を促す質問にしてください。
- 直前の回答が十分具体的なら、理由・判断軸・再現性などをさらに一段深掘りしてください。
- 質問は必ず1つだけにしてください。
- displayText は画面表示用の端的な質問文にしてください。
- speechText は面接官として自然な会話口調の読み上げ文にしてください。`;
}

/**
 * IFollowUpQuestionService の Gemini 実装（Vercel AI SDK / 構造化出力）。
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
