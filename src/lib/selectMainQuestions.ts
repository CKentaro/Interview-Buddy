import { EvaluationAxis } from "@/generated/prisma/enums";
import type { BankQuestion, QuestionBank } from "@/types/questionBank";

export type SelectedQuestion = {
  bankId: string;
  displayText: string;
  speechText: string;
  axis: EvaluationAxis;
  displayOrder: number;
};

function fisherYates<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

function pickOne(questions: BankQuestion[]): BankQuestion {
  const shuffled = fisherYates(questions);
  const picked = shuffled[0];
  if (!picked) throw new Error("Question pool is empty");
  return picked;
}

function pickTwo(questions: BankQuestion[]): [BankQuestion, BankQuestion] {
  if (questions.length < 2) throw new Error("Question pool has fewer than 2 questions");
  const shuffled = fisherYates(questions);
  return [shuffled[0]!, shuffled[1]!];
}

function toSelected(q: BankQuestion, axis: EvaluationAxis, displayOrder: number): SelectedQuestion {
  return { bankId: q.id, displayText: q.displayText, speechText: q.speechText, axis, displayOrder };
}

export function selectMainQuestions(bank: QuestionBank): SelectedQuestion[] {
  const sa = pickOne(bank.selfAwareness.questions);
  const [rp1, rp2] = pickTwo(bank.reproducibility.questions);
  const vl = pickOne(bank.values.questions);
  const wv = pickOne(bank.worldview.questions);

  return [
    toSelected(sa, EvaluationAxis.SELF_AWARENESS, 1),
    toSelected(rp1, EvaluationAxis.REPRODUCIBILITY, 2),
    toSelected(rp2, EvaluationAxis.REPRODUCIBILITY, 3),
    toSelected(vl, EvaluationAxis.VALUES_JUDGMENT, 4),
    toSelected(wv, EvaluationAxis.WORLDVIEW, 5),
  ];
}
