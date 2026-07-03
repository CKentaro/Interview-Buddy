import type { EvaluationAxis } from "./EvaluationAxis.vo";

/**
 * 抽選された本質問（MainQuestion）の値オブジェクト。
 * まだ永続化されていない、セッションに割り当てる前の確定済み出題を表す。
 */
export type SelectedQuestion = {
  /** 抽選元のバンク質問 ID。 */
  bankId: string;
  /** 画面表示用の質問文。 */
  displayText: string;
  /** この質問の評価軸。 */
  axis: EvaluationAxis;
  /** セッション内での表示順（1 始まり）。 */
  displayOrder: number;
};
