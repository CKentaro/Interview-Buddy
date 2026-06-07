export type BankQuestion = {
  id: string;
  displayText: string;
  speechText: string;
};

export type BankAxis = {
  axisLabel: string;
  order: number;
  questions: BankQuestion[];
};

export type QuestionBank = {
  selfAwareness: BankAxis;
  reproducibility: BankAxis;
  values: BankAxis;
  worldview: BankAxis;
};
