import type { Answer } from "../model/Answer.entity";
import type { InterviewSession } from "../model/InterviewSession.entity";
import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { Question } from "../model/Question.entity";
import type { SelectedQuestion } from "../model/SelectedQuestion.vo";

/** 面接セッションを新規作成するための入力。 */
export type CreateSessionInput = {
  userId: string;
  jobTitle?: string;
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMinor?: string;
  selectionStage?: string;
  interviewerType?: string;
  selectedQuestions: SelectedQuestion[];
};

/** 面接セッション作成結果。 */
export type CreateSessionResult = {
  session: InterviewSession;
  firstQuestion: Question;
};

/** 回答を新規作成するための入力。 */
export type SaveAnswerInput = {
  questionId: string;
  content: string;
};

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
  questionId: string;
  questionText: string;
  answerText: string | null;
};

/** 回答と深掘り質問を同一トランザクションで保存するための入力。 */
export type SaveAnswerAndCreateFollowUpQuestionInput = {
  answer: SaveAnswerInput;
  followUpQuestion: CreateFollowUpQuestionInput;
};

/** 回答と深掘り質問を同一トランザクションで保存した結果。 */
export type SaveAnswerAndCreateFollowUpQuestionResult = {
  answer: Answer;
  followUpQuestion: Question;
};

/** 回答保存とセッション終了を同一トランザクションで行うための入力。 */
export type SaveAnswerAndCompleteSessionInput = {
  sessionId: string;
  answer: SaveAnswerInput;
};

/** 質問にすでに回答が存在することを表す。 */
export class DuplicateAnswerError extends Error {
  constructor(questionId: string) {
    super(`Question already has an answer: ${questionId}`);
    this.name = "DuplicateAnswerError";
  }
}

/**
 * 面接セッションの永続化に対する契約（リポジトリ・インターフェース）。
 *
 * ドメイン層が「何ができてほしいか」だけを定義し、実装（Prisma 等）は
 * インフラ層に置く（依存性逆転）。アプリケーション層はこの IF にのみ依存する。
 */
export interface IInterviewSessionRepository {
  /** セッションと本質問群を 1 トランザクションで作成し、最初の質問を返す。 */
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;

  /** 指定ユーザーに属するセッションを取得する。存在しなければ null。 */
  findSessionByIdForUser(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession | null>;

  /** 回答対象の質問を取得する。存在しなければ null。 */
  findQuestionById(questionId: string): Promise<Question | null>;

  /** セッション内の質問を取得する。存在しなければ null。 */
  findQuestionByIdInSession(
    sessionId: string,
    questionId: string,
  ): Promise<Question | null>;

  /** 質問に回答が保存済みかどうかを返す。 */
  hasAnswerForQuestion(questionId: string): Promise<boolean>;

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

  /** 回答と深掘り質問を同一トランザクションで保存する。 */
  saveAnswerAndCreateFollowUpQuestion(
    input: SaveAnswerAndCreateFollowUpQuestionInput,
  ): Promise<SaveAnswerAndCreateFollowUpQuestionResult>;

  /** 回答保存とセッション終了を同一トランザクションで行う。 */
  saveAnswerAndCompleteSession(
    input: SaveAnswerAndCompleteSessionInput,
  ): Promise<Answer>;

  /** セッションを終了状態にする（endedAt を記録）。 */
  completeSession(sessionId: string): Promise<void>;
}
