import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { buildFeedbackContext, type FeedbackQARow } from "./buildFeedbackContext";

describe("buildFeedbackContext", () => {
  it("未回答（answerText=null）は評価対象から除外する", () => {
    const rows: FeedbackQARow[] = [
      {
        primaryAxis: EvaluationAxis.REPRODUCIBILITY,
        questionText: "Q1",
        answerText: "A1",
      },
      {
        primaryAxis: EvaluationAxis.SELF_AWARENESS,
        questionText: "Q2",
        answerText: null,
      },
    ];

    const ctx = buildFeedbackContext(rows);

    expect(ctx.allQAPairs).toEqual([{ questionText: "Q1", answerText: "A1" }]);
  });

  it("軸別は常に4軸ぶん返す（該当回答が無い軸は空配列）", () => {
    const ctx = buildFeedbackContext([]);

    expect(ctx.axisQAPairs.map((a) => a.axis)).toEqual([
      EvaluationAxis.REPRODUCIBILITY,
      EvaluationAxis.SELF_AWARENESS,
      EvaluationAxis.VALUES_JUDGMENT,
      EvaluationAxis.WORLDVIEW,
    ]);
    expect(ctx.axisQAPairs.every((a) => a.pairs.length === 0)).toBe(true);
    expect(ctx.allQAPairs).toEqual([]);
  });

  it("回答済みを主軸ごとにグルーピングする（深掘りも親の軸へ）", () => {
    const rows: FeedbackQARow[] = [
      {
        primaryAxis: EvaluationAxis.REPRODUCIBILITY,
        questionText: "本質問",
        answerText: "本回答",
      },
      {
        primaryAxis: EvaluationAxis.REPRODUCIBILITY,
        questionText: "深掘り",
        answerText: "深掘り回答",
      },
      {
        primaryAxis: EvaluationAxis.WORLDVIEW,
        questionText: "世界観Q",
        answerText: "世界観A",
      },
    ];

    const ctx = buildFeedbackContext(rows);

    const repro = ctx.axisQAPairs.find(
      (a) => a.axis === EvaluationAxis.REPRODUCIBILITY,
    );
    expect(repro?.pairs).toEqual([
      { questionText: "本質問", answerText: "本回答" },
      { questionText: "深掘り", answerText: "深掘り回答" },
    ]);
    expect(ctx.allQAPairs).toHaveLength(3);
  });

  it("primaryAxis が null の回答は軸別に含めないが総評には含める", () => {
    const rows: FeedbackQARow[] = [
      { primaryAxis: null, questionText: "Q", answerText: "A" },
    ];

    const ctx = buildFeedbackContext(rows);

    expect(ctx.axisQAPairs.every((a) => a.pairs.length === 0)).toBe(true);
    expect(ctx.allQAPairs).toEqual([{ questionText: "Q", answerText: "A" }]);
  });
});
