import { jsonError, toErrorResponse } from "@/app/api/httpError";
import type { PauseSessionResponse } from "@/app/api/types";
import { PauseInterviewUseCase } from "@/application/interview/PauseInterviewUseCase";
import { SessionStatusConflictError } from "@/application/interview/errors";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/** POST /api/sessions/[id]/pause — 回答を残したまま面接を中断する。 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await requireUser();
    const { id } = await context.params;
    const useCase = new PauseInterviewUseCase(
      new PrismaInterviewSessionRepository(),
    );
    await useCase.execute(userId, id);
    const response: PauseSessionResponse = {
      sessionId: id,
      status: "PAUSED",
    };
    return Response.json(response);
  } catch (error) {
    if (error instanceof SessionStatusConflictError) {
      return jsonError("Conflict", 409);
    }
    return toErrorResponse(error, "POST /api/sessions/[id]/pause");
  }
}
