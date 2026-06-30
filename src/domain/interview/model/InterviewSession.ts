import type { Question } from "./Question";

/**
 * 面接セッションのエンティティ（ユビキタス言語: InterviewSession）。
 *
 * 1 回の面接練習全体を表す集約ルート。出題された Question 群を内包する。
 * 永続化（Prisma の行）から独立した、ドメインが扱うセッションの形を定義する。
 */
export type InterviewSession = {
  id: string;
  userId: string;
  /** 面接開始日時。 */
  startedAt: Date;
  /** 面接終了日時。未終了なら null。 */
  endedAt: Date | null;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  /** セッションで出題された質問（displayOrder 昇順）。 */
  questions: Question[];
};

/** セッションが終了済みか（endedAt が記録されているか）。 */
export function isSessionCompleted(session: InterviewSession): boolean {
  return session.endedAt !== null;
}
