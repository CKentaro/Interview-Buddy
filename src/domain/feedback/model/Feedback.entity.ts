import type { AxisEvaluation } from "./AxisEvaluation.entity";

/**
 * フィードバックのエンティティ（ユビキタス言語: Feedback）。
 *
 * 1 つの InterviewSession に対する総評と 4 軸評価をまとめた集約。
 * 永続化（Prisma の行）から独立した、ドメインが扱うフィードバックの形を定義する。
 */
export type Feedback = {
  id: string;
  /** 総評コメント。 */
  overallComment: string;
  /** 対象の InterviewSession の id。 */
  sessionId: string;
  /** 4 軸それぞれの評価。 */
  axisEvaluations: AxisEvaluation[];
};
