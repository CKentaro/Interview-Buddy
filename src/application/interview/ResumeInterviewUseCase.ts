import type { SessionQuestionWithAnswer } from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IInterviewSessionLifecycleRepository } from "@/domain/interview/ports/IInterviewSessionLifecycleRepository";
import { SessionStatus } from "@/domain/interview/model/SessionStatus.vo";
import { resolveResumePosition } from "@/domain/interview/services/resolveResumePosition";
import { getTotalQuestionCount } from "@/domain/interview/model/interviewLengthPolicy";
import type { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import { SessionNotFoundError, SessionStatusConflictError } from "./errors";

export type ResumeInterviewResult = {
  sessionId: string;
  voiceEnabled: boolean;
  interviewerType: string | null;
  interviewLength: InterviewLength;
  totalQuestionCount: number;
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

    // 旧セッションは STANDARD でも本質問が5問保存されているため、
    // 現在のポリシー値ではなくDBに実在する本質問数から総数を復元する。
    const mainQuestionCount = state.questions.filter(
      (question) => question.type === QuestionType.MAIN,
    ).length;

    return {
      sessionId: state.session.id,
      voiceEnabled: state.session.voiceEnabled,
      interviewerType: state.session.interviewerType,
      interviewLength: state.session.interviewLength,
      totalQuestionCount: getTotalQuestionCount(
        state.session.interviewLength,
        mainQuestionCount,
      ),
      currentQuestion: position.question,
      questionNumber: position.questionNumber,
    };
  }
}
