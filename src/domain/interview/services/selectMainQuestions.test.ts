import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { BankAxis, QuestionBank } from "../model/QuestionBank.vo";
import {
  InsufficientQuestionBankError,
  selectMainQuestions,
} from "./selectMainQuestions";

function axis(axisValue: EvaluationAxis, n: number): BankAxis {
  return {
    axis: axisValue,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${axisValue}-${i}`,
      displayText: `${axisValue} 質問 ${i}`,
    })),
  };
}

const bank: QuestionBank = {
  values: axis(EvaluationAxis.VALUES_JUDGMENT, 3),
  reproducibility: axis(EvaluationAxis.REPRODUCIBILITY, 3),
  selfAwareness: axis(EvaluationAxis.SELF_AWARENESS, 3),
  worldview: axis(EvaluationAxis.WORLDVIEW, 3),
};

describe("selectMainQuestions", () => {
  it("本質問5問を固定の軸・表示順で返す", () => {
    const result = selectMainQuestions(bank);

    expect(result).toHaveLength(5);
    expect(result.map((q) => q.displayOrder)).toEqual([1, 2, 3, 4, 5]);
    expect(result.map((q) => q.axis)).toEqual([
      EvaluationAxis.SELF_AWARENESS,
      EvaluationAxis.REPRODUCIBILITY,
      EvaluationAxis.REPRODUCIBILITY,
      EvaluationAxis.VALUES_JUDGMENT,
      EvaluationAxis.WORLDVIEW,
    ]);
  });

  it("再現性は重複しない2問を選ぶ", () => {
    const result = selectMainQuestions(bank);
    const reproducibility = result.filter(
      (q) => q.axis === EvaluationAxis.REPRODUCIBILITY,
    );

    expect(new Set(reproducibility.map((q) => q.bankId)).size).toBe(2);
  });

  it("乱数源を注入すれば決定的（同じ乱数源なら同じ結果）になる", () => {
    const a = selectMainQuestions(bank, { random: () => 0.42 });
    const b = selectMainQuestions(bank, { random: () => 0.42 });
    expect(a.map((q) => q.bankId)).toEqual(b.map((q) => q.bankId));
  });

  it("再現性の出題候補が2問未満なら例外を投げる", () => {
    const thinBank: QuestionBank = {
      ...bank,
      reproducibility: axis(EvaluationAxis.REPRODUCIBILITY, 1),
    };
    expect(() => selectMainQuestions(thinBank)).toThrow(
      InsufficientQuestionBankError,
    );
  });
});
