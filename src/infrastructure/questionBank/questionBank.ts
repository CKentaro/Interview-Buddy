import type { BankQuestion } from "@/domain/interview/model/QuestionBank";

/**
 * questionBank.json の生データ形状の型。
 *
 * JSON 上の `axis` は文字列なので、ドメインの EvaluationAxis ではなく string で受ける。
 * 文字列からドメイン enum への変換は JsonQuestionBankProvider が担う（依存性逆転の境界）。
 */
export type RawBankAxis = {
  axis: string;
  questions: BankQuestion[];
};

export type RawQuestionBank = {
  values: RawBankAxis;
  reproducibility: RawBankAxis;
  selfAwareness: RawBankAxis;
  worldview: RawBankAxis;
};
