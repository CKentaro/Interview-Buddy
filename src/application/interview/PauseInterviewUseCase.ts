import { SessionStatus } from "@/domain/interview/model/SessionStatus.vo";
import type { IInterviewSessionLifecycleRepository } from "@/domain/interview/ports/IInterviewSessionLifecycleRepository";
import { SessionNotFoundError, SessionStatusConflictError } from "./errors";

/** 面接を保存したまま中断するユースケース。 */
export class PauseInterviewUseCase {
  constructor(
    private readonly lifecycleRepository: IInterviewSessionLifecycleRepository,
  ) {}

  async execute(userId: string, sessionId: string): Promise<void> {
    const status = await this.lifecycleRepository.pauseOwnedSession(
      userId,
      sessionId,
    );
    if (status === null) {
      throw new SessionNotFoundError(sessionId);
    }
    if (status === SessionStatus.COMPLETED) {
      throw new SessionStatusConflictError(
        `Completed session cannot be paused: ${sessionId}`,
      );
    }
  }
}
