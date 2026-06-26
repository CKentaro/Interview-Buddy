import type { BankQuestion, QuestionBank } from "../model/QuestionBank";
import type { EvaluationAxis } from "../model/EvaluationAxis";
import type { SelectedQuestion } from "../model/SelectedQuestion";

/** セッションごとに出題する本質問（MainQuestion）の数。 */
export const MAIN_QUESTION_COUNT = 5;

export type SelectMainQuestionsOptions = {
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

function pickOne(questions: BankQuestion[], random: () => number): BankQuestion {
  const picked = fisherYates(questions, random)[0];
  if (!picked) {
    throw new InsufficientQuestionBankError("Question pool is empty");
  }
  return picked;
}

function pickTwo(
  questions: BankQuestion[],
  random: () => number,
): [BankQuestion, BankQuestion] {
  if (questions.length < 2) {
    throw new InsufficientQuestionBankError(
      "Question pool has fewer than 2 questions",
    );
  }
  const shuffled = fisherYates(questions, random);
  return [shuffled[0]!, shuffled[1]!];
}

function toSelected(
  question: BankQuestion,
  axis: EvaluationAxis,
  displayOrder: number,
): SelectedQuestion {
  return {
    bankId: question.id,
    displayText: question.displayText,
    axis,
    displayOrder,
  };
}

/**
 * 質問バンクから本質問 5 問を抽選するドメインサービス。
 *
 * 軸と表示順は固定:
 *   1. 自己認識        ×1
 *   2,3. 再現性        ×2（重複しない）
 *   4. 価値観 / 判断   ×1
 *   5. 世界観 / 知的好奇心 ×1
 */
export function selectMainQuestions(
  bank: QuestionBank,
  options: SelectMainQuestionsOptions = {},
): SelectedQuestion[] {
  const random = options.random ?? Math.random;

  const sa = pickOne(bank.selfAwareness.questions, random);
  const [rp1, rp2] = pickTwo(bank.reproducibility.questions, random);
  const vl = pickOne(bank.values.questions, random);
  const wv = pickOne(bank.worldview.questions, random);

  return [
    toSelected(sa, bank.selfAwareness.axis, 1),
    toSelected(rp1, bank.reproducibility.axis, 2),
    toSelected(rp2, bank.reproducibility.axis, 3),
    toSelected(vl, bank.values.axis, 4),
    toSelected(wv, bank.worldview.axis, 5),
  ];
}
