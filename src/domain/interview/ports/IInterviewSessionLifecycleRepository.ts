import type { InterviewSession } from "../model/InterviewSession.entity";
import type { SessionStatus } from "../model/SessionStatus.vo";
import type { SessionQuestionWithAnswer } from "./IInterviewSessionRepository";

/** HOME に表示する中断セッションのサマリ。 */
export type ResumableSessionSummary = {
  id: string;
  startedAt: Date;
  companyName: string | null;
  industryMajor: string | null;
  industryMinor: string | null;
  jobMajor: string | null;
  jobMinor: string | null;
  selectionStage: string | null;
  interviewerType: string | null;
  answeredQuestionCount: number;
};

/** 再開位置を決めるための、セッションと回答状況。 */
export type ResumeSessionState = {
  session: InterviewSession;
  questions: SessionQuestionWithAnswer[];
};

/** 中断・再開というセッションライフサイクル専用の永続化契約。 */
export interface IInterviewSessionLifecycleRepository {
  /** 本人のセッションを中断し、更新後の状態を返す。非存在・非所有なら null。 */
  pauseOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<SessionStatus | null>;

  /** 本人の中断セッションを再開し、回答状況を返す。非存在・非所有なら null。 */
  resumeOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<ResumeSessionState | null>;

  /** 本人の中断中セッションを新しい順で返す。 */
  findPausedByUser(userId: string): Promise<ResumableSessionSummary[]>;
}
