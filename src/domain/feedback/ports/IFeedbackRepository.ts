import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { Feedback } from "../model/Feedback";

/** 保存する 1 軸分の評価（永続化前なので id を持たない）。 */
export type NewAxisEvaluation = {
  axis: EvaluationAxis;
  comment: string;
};

/** フィードバック新規保存の入力（永続化前の値）。 */
export type NewFeedback = {
  sessionId: string;
  overallComment: string;
  axisEvaluations: NewAxisEvaluation[];
};

/**
 * フィードバックの永続化に対する契約（リポジトリ・インターフェース）。
 *
 * ドメイン層が「何ができてほしいか」だけを定義し、実装（Prisma 等）は
 * インフラ層に置く（依存性逆転）。
 */
export interface IFeedbackRepository {
  /** セッションに紐づくフィードバックを取得する。無ければ null。 */
  findBySessionId(sessionId: string): Promise<Feedback | null>;

  /** フィードバック（総評＋4軸評価）を保存して返す。 */
  save(feedback: NewFeedback): Promise<Feedback>;
}
