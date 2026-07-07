import type {
  IFeedbackSessionReader,
  SessionFeedbackState,
} from "@/domain/feedback/ports/IFeedbackSessionReader";
import { prisma } from "@/lib/prisma";

/**
 * IFeedbackSessionReader の Prisma 実装。
 * userId スコープで所有チェックを兼ね、面接の終了時刻だけを読む。
 */
export class PrismaFeedbackSessionReader implements IFeedbackSessionReader {
  async findOwnedSessionState(
    userId: string,
    sessionId: string,
  ): Promise<SessionFeedbackState | null> {
    // where に userId を含めることで「本人のセッションのみ」を保証する（非所有は null）。
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
      select: { endedAt: true },
    });
    return session === null ? null : { endedAt: session.endedAt };
  }
}
