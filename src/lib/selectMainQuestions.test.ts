import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/generated/prisma/enums";
import type { BankAxis, QuestionBank } from "@/types/questionBank";

import { selectMainQuestions } from "./selectMainQuestions";

function axis(label: string, n: number): BankAxis {
  return {
    axisLabel: label,
    order: 1,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${label}-${i}`,
      displayText: `${label} 質問 ${i}`,
      speechText: `${label} 読み上げ ${i}`,
    })),
  };
}

const bank: QuestionBank = {
  selfAwareness: axis("selfAwareness", 3),
  reproducibility: axis("reproducibility", 3),
  values: axis("values", 3),
  worldview: axis("worldview", 3),
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
});
