import type { EvaluationAxis } from "@/generated/prisma/enums";

export type BankQuestion = {
  id: string;
  displayText: string;
};

export type BankAxis = {
  axis: EvaluationAxis;
  questions: BankQuestion[];
};

export type QuestionBank = {
  values: BankAxis;
  reproducibility: BankAxis;
  selfAwareness: BankAxis;
  worldview: BankAxis;
};
