import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.hoisted(() => vi.fn());
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => () => "mock-model",
}));
vi.mock("ai", () => ({
  generateText,
  Output: { object: (spec: unknown) => spec },
}));

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { GeminiFollowUpQuestionService } from "./GeminiFollowUpQuestionService";
import { GeminiQuestionSpeechService } from "./GeminiQuestionSpeechService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("面接官タイプ別指示のプロンプト合成", () => {
  it("深掘りの基本プロンプトへ厳しめの指示を追加する", async () => {
    generateText.mockResolvedValue({
      output: {
        displayText: "具体的な成果は何ですか。",
        speechText: "成果は？",
      },
    });

    await new GeminiFollowUpQuestionService().generate({
      parentMainQuestionText: "取り組みを教えてください。",
      axis: EvaluationAxis.REPRODUCIBILITY,
      conversationHistory: [],
      interviewerType: "strict",
    });

    const prompt = generateText.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("## 面接官タイプ別の指示");
    expect(prompt).toContain("簡潔で厳格な口調");
    expect(prompt).toContain(
      "質問の目的、評価基準、深掘り方針、出力形式は共通の指示に従い",
    );
    expect(prompt).not.toContain("事実・役割・行動・結果の具体化");
    expect(prompt).toContain("取り組みを教えてください。");
  });

  it("次の本質問への発話へフレンドリーの指示を追加する", async () => {
    generateText.mockResolvedValue({
      output: { speechText: "ありがとうございます。" },
    });

    await new GeminiQuestionSpeechService().generate({
      displayText: "次の質問です。",
      previousQuestionText: "前の質問です。",
      previousAnswerText: "回答です。",
      interviewerType: "friendly",
    });

    const prompt = generateText.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("## 面接官タイプ別の指示");
    expect(prompt).toContain("温かく親しみやすい口調");
    expect(prompt).toContain("次の質問です。");
  });
});
