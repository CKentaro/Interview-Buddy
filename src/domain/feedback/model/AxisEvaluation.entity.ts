import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";

/**
 * 評価軸ごとの評価エンティティ（ユビキタス言語: AxisEvaluation）。
 *
 * 1 つの EvaluationAxis に対する評価コメントを表す。Feedback に属する。
 * 評価軸 enum は interview ドメインの共有 enum を参照する（単一の真実源）。
 */
export type AxisEvaluation = {
  id: string;
  axis: EvaluationAxis;
  comment: string;
};
