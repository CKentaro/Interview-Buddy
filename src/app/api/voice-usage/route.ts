import { toErrorResponse } from "@/app/api/httpError";
import type { VoiceUsageResponse } from "@/app/api/types";
import { GetVoiceSessionQuotaUseCase } from "@/application/interview/GetVoiceSessionQuotaUseCase";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/** GET /api/voice-usage — 本日(JST)の音声ありセッション残回数を返す。 */
export async function GET(): Promise<Response> {
  try {
    const userId = await requireUser();

    const useCase = new GetVoiceSessionQuotaUseCase(
      new PrismaInterviewSessionRepository(),
    );
    const quota = await useCase.execute(userId);

    const response: VoiceUsageResponse = quota;
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error, "GET /api/voice-usage");
  }
}
