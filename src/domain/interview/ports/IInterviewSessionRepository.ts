import type { Answer } from "../model/Answer.entity";
import type { InterviewSession } from "../model/InterviewSession.entity";
import type { InterviewLength } from "../model/InterviewLength.vo";
import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { Question } from "../model/Question.entity";
import type { QuestionType } from "../model/QuestionType.vo";
import type { SelectedQuestion } from "../model/SelectedQuestion.vo";

/** 面接詳細の 1 問分（質問＋その回答。未回答なら answer は null）。 */
export type SessionQuestionWithAnswer = {
  id: string;
  type: QuestionType;
  content: string;
  displayOrder: number;
  primaryAxis: EvaluationAxis | null;
  parentQuestionId: string | null;
  answer: { id: string; content: string } | null;
};

/** 履歴一覧の 1 行（完了済みセッションのサマリ）。 */
export type SessionSummary = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  /** そのセッションの質問数（MAIN＋FOLLOW_UP）。 */
  questionCount: number;
  /** Feedback が生成済みか。 */
  hasFeedback: boolean;
};

/** 面接詳細（セッション情報＋Q&A 書き起こし）。feedback は別ポートで合成する。 */
export type InterviewSessionDetail = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  /** 出題構成（面接の長さ）。同じ設定でやり直す導線の復元に使う。 */
  interviewLength: InterviewLength;
  voiceEnabled: boolean;
  /** displayOrder 昇順。MAIN / FOLLOW_UP を含む。 */
  questions: SessionQuestionWithAnswer[];
};

/** 面接セッションを新規作成するための入力。 */
export type CreateSessionInput = {
  userId: string;
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMajor?: string;
  jobMinor?: string;
  selectionStage?: string;
  interviewerType?: string;
  /** AI 音声読み上げ(TTS)を使う面接か（TTS ゲートの判定に永続化する）。 */
  voiceEnabled?: boolean;
  /** 本質問数と深掘り上限を決める固定の長さ設定。 */
  interviewLength: InterviewLength;
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

  /**
   * 本日(JST)の音声利用枠をアトミックに 1 つ消費する。消費できたら true、
   * すでに本日分を使用済みなら false を返す（例外にしない）。
   *
   * DB の一意制約 VoiceUsage(userId, usageDate) に依存し、同時リクエスト(TOCTOU)でも
   * 2 回目は false になる。消費はセッション作成より前に行い、中断（セッション削除）で
   * 枠が復活しないようログはセッションと分離している。
   *
   * @param usageDate JST の "YYYY-MM-DD"
   */
  tryConsumeVoiceQuota(userId: string, usageDate: string): Promise<boolean>;

  /**
   * 指定日(JST)の音声(TTS)利用ログの数を数える（残回数表示用）。判定キーは
   * tryConsumeVoiceQuota と同じ usageDate なので、消費と表示の「本日」定義が一致する。
   * ログはセッション削除（中断）では消えないため、中断による枠の復活を防げる。
   *
   * @param usageDate JST の "YYYY-MM-DD"
   */
  countVoiceUsageOnDate(userId: string, usageDate: string): Promise<number>;

  /**
   * 指定セッションが本人のもので、かつ音声あり(voiceEnabled=true)かを返す。
   * TTS エンドポイントの利用可否ゲートに使う（直接叩きによる制限回避を防ぐ）。
   */
  isVoiceEnabledSessionForUser(
    userId: string,
    sessionId: string,
  ): Promise<boolean>;

  /** 指定ユーザーに属するセッションを取得する。存在しなければ null。 */
  findSessionByIdForUser(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession | null>;

  /**
   * 本人のセッションを削除する（関連はカスケード）。userId スコープで所有を保証し、
   * 削除できたら true、対象が無い/非所有なら false（呼び出し側で 404 秘匿に使う）。
   */
  deleteOwnedSession(userId: string, sessionId: string): Promise<boolean>;

  /**
   * 本人のセッション詳細（Q&A を displayOrder 昇順で内包）を取得する。
   * 存在しない、または本人のセッションでなければ null（404 秘匿に使う）。
   */
  findDetailById(
    userId: string,
    sessionId: string,
  ): Promise<InterviewSessionDetail | null>;

  /**
   * 本人の完了済み（endedAt != null）セッション一覧を startedAt 降順で返す。
   * 各行に質問数と Feedback 有無を含む。中断セッションは含めない。
   */
  findCompletedByUser(userId: string): Promise<SessionSummary[]>;

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
