import type { EvaluationAxis } from "./EvaluationAxis.vo";
import { QuestionType } from "./QuestionType.vo";

/**
 * 質問エンティティ（ユビキタス言語: Question）。
 *
 * MainQuestion / FollowUpQuestion の両方を表す。永続化の都合（Prisma の行）から
 * 独立した、ドメインが扱う質問の形を定義する。
 */
export type Question = {
  id: string;
  type: QuestionType;
  content: string;
  /** セッション内での表示順。MainQuestion の出題順序の基準になる。 */
  displayOrder: number;
  /**
   * 深掘りの深さ。MainQuestion は 0、その n 回目の深掘りは n。
   * 面接の進行判定（深掘りを続けるか）に用いる中心的な値。
   */
  depthCount: number;
  primaryAxis: EvaluationAxis | null;
  /** 親の MainQuestion の id。MainQuestion 自身は null。 */
  parentQuestionId: string | null;
};

/** MainQuestion かどうか。 */
export function isMainQuestion(question: Question): boolean {
  return question.type === QuestionType.MAIN;
}
