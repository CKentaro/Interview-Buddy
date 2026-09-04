import type { BankAxis, BankQuestion, QuestionBank } from "../model/QuestionBank.vo";
import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import {
  MAIN_QUESTION_AXIS_PLAN,
  type MainQuestionPlanEntry,
} from "../model/mainQuestionPlan";
import type { SelectedQuestion } from "../model/SelectedQuestion.vo";
import { MainQuestionSource } from "../model/SelectedQuestion.vo";

export { MAIN_QUESTION_COUNT } from "../model/mainQuestionPlan";

export type SelectMainQuestionsOptions = {
  /** 長さ設定から解決した軸・表示順。既定は普通の 5 問。 */
  plan?: readonly MainQuestionPlanEntry[];
  /**
   * 乱数源（0 以上 1 未満）。既定は Math.random。
   * テストで決定的な抽選を行えるよう注入可能にしている。
   */
  random?: () => number;
};

/** 出題候補が足りないなど、バンクの内容が不正なときに投げる。 */
export class InsufficientQuestionBankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientQuestionBankError";
  }
}

function fisherYates<T>(arr: readonly T[], random: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

function toSelected(
  question: BankQuestion,
  axis: EvaluationAxis,
  displayOrder: number,
): SelectedQuestion {
  return {
    bankId: question.id,
    source: MainQuestionSource.BANK,
    displayText: question.displayText,
    axis,
    displayOrder,
  };
}

/**
 * 質問バンクから本質問を抽選するドメインサービス。
 *
 * 軸と表示順は {@link MAIN_QUESTION_AXIS_PLAN} に完全に従う。軸の並びをここに
 * 重ねて持つと、計画を変えたときに生成側（IMainQuestionGenerationService）と
 * 食い違うため、計画を舐めて対応する軸の候補から引く形にしている。
 * 同じ軸が複数回現れる場合は、同じ質問を重ねて出さない。
 */
export function selectMainQuestions(
  bank: QuestionBank,
  options: SelectMainQuestionsOptions = {},
): SelectedQuestion[] {
  const random = options.random ?? Math.random;
  const plan = options.plan ?? MAIN_QUESTION_AXIS_PLAN;

  const byAxis = new Map<EvaluationAxis, BankAxis>();
  for (const bankAxis of [
    bank.selfAwareness,
    bank.reproducibility,
    bank.values,
    bank.worldview,
  ]) {
    byAxis.set(bankAxis.axis, bankAxis);
  }

  const usedBankIds = new Set<string>();
  return plan.map((entry) => {
    const bankAxis = byAxis.get(entry.axis);
    if (!bankAxis) {
      throw new InsufficientQuestionBankError(
        `Question bank has no pool for axis ${entry.axis}`,
      );
    }
    const candidates = bankAxis.questions.filter(
      (question) => !usedBankIds.has(question.id),
    );
    const picked = fisherYates(candidates, random)[0];
    if (!picked) {
      throw new InsufficientQuestionBankError(
        `Question pool for axis ${entry.axis} has fewer questions than the plan requires`,
      );
    }
    usedBankIds.add(picked.id);
    return toSelected(picked, entry.axis, entry.displayOrder);
  });
}
