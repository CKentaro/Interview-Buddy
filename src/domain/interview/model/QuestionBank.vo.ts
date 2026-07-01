import type { EvaluationAxis } from "./EvaluationAxis.vo";

/** 質問バンク内の 1 問。永続化前の出題候補を表す。 */
export type BankQuestion = {
  /** バンク上の質問 ID（例: "vl_01"）。 */
  id: string;
  /** 画面表示用の質問文。 */
  displayText: string;
};

/** 1 つの評価軸と、その軸に属する出題候補。 */
export type BankAxis = {
  axis: EvaluationAxis;
  questions: BankQuestion[];
};

/**
 * 質問バンク（ユビキタス言語: QuestionBank）。
 * 4 つの評価軸ごとに出題候補を持つ、面接の出題元となる参照データ。
 */
export type QuestionBank = {
  values: BankAxis;
  reproducibility: BankAxis;
  selfAwareness: BankAxis;
  worldview: BankAxis;
};
