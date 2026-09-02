import type { SessionQuestionWithAnswer } from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IInterviewSessionLifecycleRepository } from "@/domain/interview/ports/IInterviewSessionLifecycleRepository";
import { SessionStatus } from "@/domain/interview/model/SessionStatus.vo";
import { resolveResumePosition } from "@/domain/interview/services/resolveResumePosition";
import { SessionNotFoundError, SessionStatusConflictError } from "./errors";

export type ResumeInterviewResult = {
  sessionId: string;
  voiceEnabled: boolean;
  interviewerType: string | null;
  currentQuestion: SessionQuestionWithAnswer;
  questionNumber: number;
};

/** 中断した面接を、DBに保存された最後の進行位置から再開するユースケース。 */
export class ResumeInterviewUseCase {
  constructor(
    private readonly lifecycleRepository: IInterviewSessionLifecycleRepository,
  ) {}

  async execute(
    userId: string,
    sessionId: string,
  ): Promise<ResumeInterviewResult> {
    const state = await this.lifecycleRepository.resumeOwnedSession(
      userId,
      sessionId,
    );
    if (state === null) {
      throw new SessionNotFoundError(sessionId);
    }
    if (state.session.status === SessionStatus.COMPLETED) {
      throw new SessionStatusConflictError(
        `Completed session cannot be resumed: ${sessionId}`,
      );
    }

    const position = resolveResumePosition(state.questions);
    if (position === null) {
      throw new SessionStatusConflictError(
        `Session has no unanswered question: ${sessionId}`,
      );
    }

    return {
      sessionId: state.session.id,
      voiceEnabled: state.session.voiceEnabled,
      interviewerType: state.session.interviewerType,
      currentQuestion: position.question,
      questionNumber: position.questionNumber,
    };
  }
}
