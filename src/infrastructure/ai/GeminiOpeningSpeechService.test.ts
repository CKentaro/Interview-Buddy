import { beforeEach, describe, expect, it, vi } from "vitest";

// AI SDK をモック（実 API を叩かずにオーケストレーションだけ検証する）。
const generateText = vi.hoisted(() => vi.fn());
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => () => "mock-model",
}));
vi.mock("ai", () => ({
  generateText,
  Output: { object: (spec: unknown) => spec },
}));

import { GeminiOpeningSpeechService } from "./GeminiOpeningSpeechService";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeminiOpeningSpeechService", () => {
  it("生成された speechText を返す", async () => {
    generateText.mockResolvedValue({ output: { speechText: "こんにちは。まず…" } });

    const result = await new GeminiOpeningSpeechService().generate({
      displayText: "自己紹介をお願いします。",
    });

    expect(result).toBe("こんにちは。まず…");
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("設定と最初の質問をプロンプトに含める", async () => {
    generateText.mockResolvedValue({ output: { speechText: "s" } });

    await new GeminiOpeningSpeechService().generate({
      displayText: "自己紹介をお願いします。",
      companyName: "Example Inc.",
      selectionStage: "final",
      interviewerType: "strict",
    });

    const prompt = generateText.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain("自己紹介をお願いします。");
    expect(prompt).toContain("Example Inc.");
    expect(prompt).toContain("final");
    expect(prompt).toContain("strict");
  });
});
