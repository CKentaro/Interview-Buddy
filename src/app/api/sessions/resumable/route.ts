import { toErrorResponse } from "@/app/api/httpError";
import { toResumableSessionItem } from "@/app/api/sessionPresenter";
import type { ResumableSessionListResponse } from "@/app/api/types";
import { GetResumableInterviewsUseCase } from "@/application/interview/GetResumableInterviewsUseCase";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/** GET /api/sessions/resumable — 本人の中断中面接を新しい順で返す。 */
export async function GET(): Promise<Response> {
  try {
    const userId = await requireUser();
    const useCase = new GetResumableInterviewsUseCase(
      new PrismaInterviewSessionRepository(),
    );
    const sessions = await useCase.execute(userId);
    const response: ResumableSessionListResponse = {
      sessions: sessions.map(toResumableSessionItem),
    };
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error, "GET /api/sessions/resumable");
  }
}
