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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeminiFeedbackService", () => {
  it("全成功: 総評＋4軸を返す（軸の順序を保つ・呼び出しは5回）", async () => {
    generateText.mockResolvedValue({
      output: { comment: "c", overallComment: "o" },
    });

    const result = await new GeminiFeedbackService().generate(context);

    expect(result.overallComment).toBe("o");
    expect(result.axisFeedbacks.map((a) => a.axis)).toEqual([
      EvaluationAxis.REPRODUCIBILITY,
      EvaluationAxis.SELF_AWARENESS,
      EvaluationAxis.VALUES_JUDGMENT,
      EvaluationAxis.WORLDVIEW,
    ]);
    expect(result.axisFeedbacks.every((a) => a.comment === "c")).toBe(true);
    expect(generateText).toHaveBeenCalledTimes(5);
  });

  it("1つでも失敗すれば generate 全体が reject する（部分結果を返さない）", async () => {
    generateText.mockResolvedValue({
      output: { comment: "c", overallComment: "o" },
    });
    generateText.mockRejectedValueOnce(new Error("axis failed"));

    await expect(new GeminiFeedbackService().generate(context)).rejects.toThrow(
      "axis failed",
    );
  });
});
