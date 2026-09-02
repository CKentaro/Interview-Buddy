import { jsonError, toErrorResponse } from "@/app/api/httpError";
import { toApiQuestionType } from "@/app/api/sessionPresenter";
import type { ResumeSessionResponse } from "@/app/api/types";
import { ResumeInterviewUseCase } from "@/application/interview/ResumeInterviewUseCase";
import { SessionStatusConflictError } from "@/application/interview/errors";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/** POST /api/sessions/[id]/resume — DB上の回答状況から面接を再開する。 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await requireUser();
    const { id } = await context.params;
    const useCase = new ResumeInterviewUseCase(
      new PrismaInterviewSessionRepository(),
    );
    const result = await useCase.execute(userId, id);
    const response: ResumeSessionResponse = {
      sessionId: result.sessionId,
      status: "IN_PROGRESS",
      voiceEnabled: result.voiceEnabled,
      interviewerType: result.interviewerType,
      questionNumber: result.questionNumber,
      currentQuestion: {
        id: result.currentQuestion.id,
        type: toApiQuestionType(result.currentQuestion.type),
        text: result.currentQuestion.content,
        speechText: result.currentQuestion.content,
        parentQuestionId: result.currentQuestion.parentQuestionId,
      },
    };
    return Response.json(response);
  } catch (error) {
    if (error instanceof SessionStatusConflictError) {
      return jsonError("Conflict", 409);
    }
    return toErrorResponse(error, "POST /api/sessions/[id]/resume");
  }
}
