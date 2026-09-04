import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "../model/EvaluationAxis.vo";
import {
  LONG_MAIN_QUESTION_AXIS_PLAN,
  MAIN_QUESTION_AXIS_PLAN,
} from "../model/mainQuestionPlan";
import { MainQuestionSource } from "../model/SelectedQuestion.vo";
import { reuseMainQuestions, type PreviousMainQuestion } from "./reuseMainQuestions";

/** 計画どおりの軸構成で保存された、前回セッションの大問。 */
function previousFor(
  plan: readonly { displayOrder: number; axis: EvaluationAxis }[],
): PreviousMainQuestion[] {
  return plan.map((entry) => ({
    content: `前回の質問 ${entry.displayOrder}`,
    displayOrder: entry.displayOrder,
    primaryAxis: entry.axis,
  }));
}

describe("reuseMainQuestions", () => {
  it("軸構成が計画と一致すれば、前回の質問文をそのまま引き継ぐ", () => {
    const result = reuseMainQuestions(
      previousFor(MAIN_QUESTION_AXIS_PLAN),
      MAIN_QUESTION_AXIS_PLAN,
    );

    expect(result).not.toBeNull();
    expect(result!.map((question) => question.displayText)).toEqual([
      "前回の質問 1",
      "前回の質問 2",
      "前回の質問 3",
      "前回の質問 4",
    ]);
    expect(result!.map((question) => question.axis)).toEqual(
      MAIN_QUESTION_AXIS_PLAN.map((entry) => entry.axis),
    );
    expect(result!.every((question) => question.source === MainQuestionSource.REUSED)).toBe(true);
    expect(result!.every((question) => question.bankId === null)).toBe(true);
  });

  it("表示順が入れ替わって渡されても、表示順の昇順で計画に対応づける", () => {
    const shuffled = [...previousFor(MAIN_QUESTION_AXIS_PLAN)].reverse();

    const result = reuseMainQuestions(shuffled, MAIN_QUESTION_AXIS_PLAN);

    expect(result!.map((question) => question.displayText)).toEqual([
      "前回の質問 1",
      "前回の質問 2",
      "前回の質問 3",
      "前回の質問 4",
    ]);
  });

  it("問数が計画と違えば引き継がない（面接の長さを変えた場合）", () => {
    expect(
      reuseMainQuestions(
        previousFor(MAIN_QUESTION_AXIS_PLAN),
        LONG_MAIN_QUESTION_AXIS_PLAN,
      ),
    ).toBeNull();
  });

  it("軸の並びが計画と違えば引き継がない", () => {
    const previous = previousFor(MAIN_QUESTION_AXIS_PLAN);
    previous[0] = { ...previous[0]!, primaryAxis: EvaluationAxis.WORLDVIEW };

    expect(reuseMainQuestions(previous, MAIN_QUESTION_AXIS_PLAN)).toBeNull();
  });

  it("軸を持たない質問が含まれていれば引き継がない", () => {
    const previous = previousFor(MAIN_QUESTION_AXIS_PLAN);
    previous[2] = { ...previous[2]!, primaryAxis: null };

    expect(reuseMainQuestions(previous, MAIN_QUESTION_AXIS_PLAN)).toBeNull();
  });

  it("空の質問文が含まれていれば引き継がない", () => {
    const previous = previousFor(MAIN_QUESTION_AXIS_PLAN);
    previous[1] = { ...previous[1]!, content: "   " };

    expect(reuseMainQuestions(previous, MAIN_QUESTION_AXIS_PLAN)).toBeNull();
  });
});
