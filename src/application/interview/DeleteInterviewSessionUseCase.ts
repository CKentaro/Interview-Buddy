import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import { SessionNotFoundError } from "./errors";

/**
 * DELETE /api/sessions/[id] のユースケース。
 *
 * 認可は「所有者のみ」。userId スコープの削除で所有を保証し、削除できなければ
 * （非存在・非所有）情報秘匿のため {@link SessionNotFoundError} を投げる。
 * 関連（Question / Answer / Feedback）は DB のカスケード削除に委ねる。
 */
export class DeleteInterviewSessionUseCase {
  constructor(
    private readonly interviewSessionRepository: IInterviewSessionRepository,
  ) {}

  async execute(userId: string, sessionId: string): Promise<void> {
    const deleted = await this.interviewSessionRepository.deleteOwnedSession(
      userId,
      sessionId,
    );
    if (!deleted) {
      throw new SessionNotFoundError(sessionId);
    }
  }
}
