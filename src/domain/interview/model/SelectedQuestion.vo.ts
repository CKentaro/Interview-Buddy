import type { EvaluationAxis } from "./EvaluationAxis.vo";

/** 出題文の出どころ。 */
export enum MainQuestionSource {
  /** 質問バンクからの抽選。 */
  BANK = "BANK",
  /** 求人内容をもとに LLM が生成。 */
  GENERATED = "GENERATED",
  /** 過去セッションの本質問をそのまま引き継いだ（「同じ設定でもう一度」）。 */
  REUSED = "REUSED",
}

/**
 * 抽選または生成された本質問（MainQuestion）の値オブジェクト。
 * まだ永続化されていない、セッションに割り当てる前の確定済み出題を表す。
 */
export type SelectedQuestion = {
  /** 抽選元のバンク質問 ID。生成された質問（バンク外）では null。 */
  bankId: string | null;
  /** 出題文の出どころ。 */
  source: MainQuestionSource;
  /** 画面表示用の質問文。 */
  displayText: string;
  /** この質問の評価軸。 */
  axis: EvaluationAxis;
  /** セッション内での表示順（1 始まり）。 */
  displayOrder: number;
};
