import type { Answer } from "../model/Answer";
import type { EvaluationAxis } from "../model/EvaluationAxis";
import type { Question } from "../model/Question";

/** 深掘り質問を新規作成するための入力。 */
export type CreateFollowUpQuestionInput = {
  sessionId: string;
  parentMainQuestionId: string;
  content: string;
  /** セッション内の表示順（末尾に追加する想定）。 */
  displayOrder: number;
  /** 親 MainQuestion の depthCount + 1。 */
  depthCount: number;
  primaryAxis: EvaluationAxis | null;
};

/** 深掘り質問生成の文脈に使う、1 つの質問とその回答の組。 */
export type QuestionAnswerPair = {
  questionText: string;
  answerText: string | null;
};

/**
 * 面接セッションの永続化に対する契約（リポジトリ・インターフェース）。
 *
 * ドメイン層が「何ができてほしいか」だけを定義し、実装（Prisma 等）は
 * インフラ層に置く（依存性逆転）。アプリケーション層はこの IF にのみ依存する。
 */
export interface IInterviewSessionRepository {
  /** 回答対象の質問を取得する。存在しなければ null。 */
  findQuestionById(questionId: string): Promise<Question | null>;

  /**
   * 与えた MainQuestion の次（displayOrder が 1 つ大きい MAIN）を取得する。
   * 無ければ null（= もう出題する MainQuestion が無い）。
   */
  findNextMainQuestion(
    sessionId: string,
    currentMainDisplayOrder: number,
  ): Promise<Question | null>;

  /** セッション内の displayOrder の最大値（質問が無ければ 0）。 */
  getMaxDisplayOrder(sessionId: string): Promise<number>;

  /**
   * 深掘り質問生成の文脈（親 MainQuestion とその配下の深掘り質問＋各回答）を
   * displayOrder 昇順で取得する。
   */
  findConversationHistory(
    sessionId: string,
    parentMainQuestionId: string,
  ): Promise<QuestionAnswerPair[]>;

  /** 回答を保存する。 */
  saveAnswer(questionId: string, content: string): Promise<Answer>;

  /** 深掘り質問を作成して返す。 */
  createFollowUpQuestion(input: CreateFollowUpQuestionInput): Promise<Question>;

  /** セッションを終了状態にする（endedAt を記録）。 */
  completeSession(sessionId: string): Promise<void>;
}
