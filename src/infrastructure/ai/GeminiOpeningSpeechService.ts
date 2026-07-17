import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  GenerateOpeningSpeechInput,
  IOpeningSpeechService,
} from "@/domain/interview/ports/IOpeningSpeechService";
import { geminiModel } from "./geminiModel";
import { getInterviewerPromptInstruction } from "./interviewerPromptInstructions";

const speechSchema = z.object({ speechText: z.string() });

function buildPrompt(input: GenerateOpeningSpeechInput): string {
  const context = [
    input.companyName ? `- 企業名: ${input.companyName}` : null,
    input.selectionStage ? `- 選考段階: ${input.selectionStage}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `あなたは就職面接の面接官です。
面接の開始時に、応募者へ軽く挨拶してから最初の質問へ自然につなげる読み上げ文を作成してください。

## 面接の設定
${context.length > 0 ? context : "- 特になし"}

## 面接官タイプ別の指示
${getInterviewerPromptInstruction(input.interviewerType)}

## 最初の質問
${input.displayText}

## 指示
- 面接官として自然な会話口調にしてください。
- まず短い挨拶や導入を入れてから、最初の質問へつなげてください。
- 大げさな演出や過剰な自己紹介はしないでください。
- speechText には読み上げる発話文のみを入れてください。`;
}

/**
 * IOpeningSpeechService の Gemini 実装（Vercel AI SDK / 構造化出力）。
 */
export class GeminiOpeningSpeechService implements IOpeningSpeechService {
  async generate(input: GenerateOpeningSpeechInput): Promise<string> {
    const result = await generateText({
      model: geminiModel(),
      output: Output.object({ schema: speechSchema }),
      prompt: buildPrompt(input),
    });
    return result.output.speechText;
  }
}
