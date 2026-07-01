import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";

/**
 * 評価軸ごとの講評エンティティ（ユビキタス言語: AxisFeedback）。
 *
 * 1 つの EvaluationAxis に対する評価コメントを表す。Feedback に属する。
 * 評価軸 enum は interview ドメインの共有 enum を参照する（単一の真実源）。
 * （軸そのものを表す EvaluationAxis と混同しないこと。こちらは「その軸への講評」。）
 */
export type AxisFeedback = {
  id: string;
  axis: EvaluationAxis;
  comment: string;
};
