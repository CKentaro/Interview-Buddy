import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "./EvaluationAxis.vo";
import { InterviewLength } from "./InterviewLength.vo";
import {
  getInterviewLengthPolicy,
  getTotalQuestionCount,
} from "./interviewLengthPolicy";

const ALL_AXES = new Set(Object.values(EvaluationAxis));

describe("interviewLengthPolicy", () => {
  it.each([
    [InterviewLength.SHORT, 4, 1, 8],
    [InterviewLength.STANDARD, 4, 2, 12],
    [InterviewLength.LONG, 6, 2, 18],
  ] as const)(
    "%s の固定質問構成を返す",
    (length, mainCount, maxFollowUpDepth, totalCount) => {
      const policy = getInterviewLengthPolicy(length);

      expect(policy.mainQuestionPlan).toHaveLength(mainCount);
      expect(policy.maxFollowUpDepth).toBe(maxFollowUpDepth);
      expect(getTotalQuestionCount(length)).toBe(totalCount);
    },
  );

  it("長めは再現性と価値観を2問ずつ、他の軸を1問ずつ含む", () => {
    const axes = getInterviewLengthPolicy(InterviewLength.LONG)
      .mainQuestionPlan.map((entry) => entry.axis);

    expect(axes.filter((axis) => axis === EvaluationAxis.REPRODUCIBILITY))
      .toHaveLength(2);
    expect(axes.filter((axis) => axis === EvaluationAxis.VALUES_JUDGMENT))
      .toHaveLength(2);
    expect(axes.filter((axis) => axis === EvaluationAxis.SELF_AWARENESS))
      .toHaveLength(1);
    expect(axes.filter((axis) => axis === EvaluationAxis.WORLDVIEW))
      .toHaveLength(1);
  });

  it("保存済みの本質問数を指定すれば、その実数から総質問数を求める", () => {
    expect(getTotalQuestionCount(InterviewLength.STANDARD, 5)).toBe(15);
  });

  it.each(Object.values(InterviewLength))(
    "%s はフィードバックの4軸をすべて含む",
    (length) => {
      const axes = new Set(
        getInterviewLengthPolicy(length).mainQuestionPlan.map((entry) => entry.axis),
      );
      expect(axes).toEqual(ALL_AXES);
    },
  );
});
