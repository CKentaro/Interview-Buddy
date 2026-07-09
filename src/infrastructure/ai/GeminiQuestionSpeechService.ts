import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  GenerateQuestionSpeechInput,
  IQuestionSpeechService,
} from "@/domain/interview/ports/IQuestionSpeechService";
import { geminiModel } from "./geminiModel";

const speechSchema = z.object({ speechText: z.string() });

function buildPrompt(input: GenerateQuestionSpeechInput): string {
  return `あなたは就職面接の面接官です。
応募者の直前の回答に軽くリアクションしたうえで、次の質問へ自然につなげる読み上げ文を作成してください。

## 直前のやり取り
Q: ${input.previousQuestionText}
A: ${input.previousAnswerText}

## 次の質問
${input.displayText}

## 指示
- 面接官として自然な会話口調にしてください。
- まず直前の回答を受け止める一言を入れてください。
- 大げさな評価や点数付けはしないでください。
- speechText には読み上げる発話文のみを入れてください。`;
}

/**
 * IQuestionSpeechService の Gemini 実装（Vercel AI SDK / 構造化出力）。
 */
export class GeminiQuestionSpeechService implements IQuestionSpeechService {
  async generate(input: GenerateQuestionSpeechInput): Promise<string> {
    const result = await generateText({
      model: geminiModel(),
      output: Output.object({ schema: speechSchema }),
      prompt: buildPrompt(input),
    });
    return result.output.speechText;
  }
}
