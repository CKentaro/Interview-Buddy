import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { BankAxis, QuestionBank } from "../model/QuestionBank.vo";
import { MAIN_QUESTION_AXIS_PLAN } from "../model/mainQuestionPlan";
import { MainQuestionSource } from "../model/SelectedQuestion.vo";
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
  // 軸・表示順は計画から導出して比較する。ここに並びを書き写すと、計画を
  // 変えたときにテストだけが古い前提のまま通ってしまう。
  it("出題計画どおりの軸・表示順で返す", () => {
    const result = selectMainQuestions(bank);

    expect(result).toHaveLength(MAIN_QUESTION_AXIS_PLAN.length);
    expect(result.map((q) => q.displayOrder)).toEqual(
      MAIN_QUESTION_AXIS_PLAN.map((entry) => entry.displayOrder),
    );
    expect(result.map((q) => q.axis)).toEqual(
      MAIN_QUESTION_AXIS_PLAN.map((entry) => entry.axis),
    );
  });

  it("バンク由来であることを source に記録する", () => {
    const result = selectMainQuestions(bank);

    expect(result.every((q) => q.source === MainQuestionSource.BANK)).toBe(true);
    expect(result.every((q) => q.bankId !== null)).toBe(true);
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
