import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FeedbackGenerationContext } from "@/domain/feedback/ports/IFeedbackService";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";

// AI SDK をモック（実 API を叩かずにオーケストレーションだけ検証する）。
const generateText = vi.hoisted(() => vi.fn());
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => () => "mock-model",
}));
vi.mock("ai", () => ({
  generateText,
  Output: { object: (spec: unknown) => spec },
}));

import { GeminiFeedbackService } from "./GeminiFeedbackService";

const context: FeedbackGenerationContext = {
  axisQAPairs: [
    {
      axis: EvaluationAxis.REPRODUCIBILITY,
      pairs: [{ questionText: "q", answerText: "a" }],
    },
    { axis: EvaluationAxis.SELF_AWARENESS, pairs: [] },
    { axis: EvaluationAxis.VALUES_JUDGMENT, pairs: [] },
    { axis: EvaluationAxis.WORLDVIEW, pairs: [] },
  ],
  allQAPairs: [{ questionText: "q", answerText: "a" }],
  interviewerType: "strict",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeminiFeedbackService", () => {
  it("全成功: 総評＋4軸を返す（軸の順序を保つ・呼び出しは5回）", async () => {
    generateText.mockResolvedValue({
      output: { comment: "軸コメント", overallComment: "o" },
    });

    const result = await new GeminiFeedbackService().generate(context);

    expect(result.overallComment).toBe("o");
    expect(result.axisFeedbacks.map((a) => a.axis)).toEqual([
      EvaluationAxis.REPRODUCIBILITY,
      EvaluationAxis.SELF_AWARENESS,
      EvaluationAxis.VALUES_JUDGMENT,
      EvaluationAxis.WORLDVIEW,
    ]);
    expect(result.axisFeedbacks.every((a) => a.comment === "軸コメント")).toBe(
      true,
    );
    expect(generateText).toHaveBeenCalledTimes(5);
  });

  it("総評は軸別の後に生成し、軸別コメントをプロンプトで参照する", async () => {
    generateText.mockResolvedValue({
      output: { comment: "軸コメント", overallComment: "o" },
    });

    await new GeminiFeedbackService().generate(context);

    // 5回目（最後）が総評。軸別の生成結果と重複回避の指示を含む。
    const overallPrompt = generateText.mock.calls[4]![0].prompt as string;
    expect(overallPrompt).toContain("軸コメント");
    expect(overallPrompt).toContain("既に伝えた個別の指摘は繰り返さない");
  });

  it("1つでも失敗すれば generate 全体が reject する（部分結果を返さない）", async () => {
    generateText.mockResolvedValue({
      output: { comment: "c", overallComment: "o" },
    });
    generateText.mockRejectedValueOnce(new Error("axis failed"));

    await expect(new GeminiFeedbackService().generate(context)).rejects.toThrow(
      "axis failed",
    );
    // 軸別が失敗した場合、総評の生成には進まない（4軸ぶんの呼び出しのみ）。
    expect(generateText).toHaveBeenCalledTimes(4);
  });
});
