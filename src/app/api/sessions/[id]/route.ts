import { toFeedbackResponse } from "@/app/api/feedbackPresenter";
import { toErrorResponse } from "@/app/api/httpError";
import { toQuestionWithAnswer } from "@/app/api/sessionPresenter";
import type { SessionDetailResponse } from "@/app/api/types";
import { DeleteInterviewSessionUseCase } from "@/application/interview/DeleteInterviewSessionUseCase";
import { GetInterviewSessionDetailUseCase } from "@/application/interview/GetInterviewSessionDetailUseCase";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/**
 * GET /api/sessions/[id]
 *
 * セッション＋Q&A 書き起こし＋feedback（status 付きで埋め込み）を 1 本で返す唯一の詳細リソース。
 * 履歴詳細・面接直後フィードバック画面の両方から呼ばれる。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const useCase = new GetInterviewSessionDetailUseCase(
      new PrismaInterviewSessionRepository(),
      new PrismaFeedbackRepository(),
    );
    const { detail, feedback } = await useCase.execute(userId, id);

    const body: SessionDetailResponse = {
      id: detail.id,
      startedAt: detail.startedAt.toISOString(),
      endedAt: detail.endedAt?.toISOString() ?? null,
      companyName: detail.companyName,
      industryMajor: detail.industryMajor,
      industryMinor: detail.industryMinor,
      jobMajor: detail.jobMajor,
      jobMinor: detail.jobMinor,
      selectionStage: detail.selectionStage,
      interviewerType: detail.interviewerType,
      companyId: detail.companyId,
      interviewLength: detail.interviewLength,
      voiceEnabled: detail.voiceEnabled,
      questions: detail.questions.map(toQuestionWithAnswer),
      feedback: toFeedbackResponse(feedback),
    };

    return Response.json(body);
  } catch (error) {
    return toErrorResponse(error, "GET /api/sessions/[id]");
  }
}

/** DELETE /api/sessions/[id] — 本人のセッションを削除（関連はカスケード）。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const useCase = new DeleteInterviewSessionUseCase(
      new PrismaInterviewSessionRepository(),
    );
    await useCase.execute(userId, id);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/sessions/[id]");
  }
}
