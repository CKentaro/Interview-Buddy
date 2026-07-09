import { toFeedbackResponse } from "@/app/api/feedbackPresenter";
import { toErrorResponse } from "@/app/api/httpError";
import { GetFeedbackUseCase } from "@/application/feedback/GetFeedbackUseCase";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";
import { PrismaFeedbackSessionReader } from "@/infrastructure/prisma/PrismaFeedbackSessionReader";
import { requireUser } from "@/lib/auth-guard";

/**
 * GET /api/sessions/[id]/feedback
 *
 * フロントが生成完了までポーリングする軽量エンドポイント（QA は含まない）。
 * status（generating / failed / completed）付きで返し、completed のときのみ詳細を含む。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const useCase = new GetFeedbackUseCase(
      new PrismaFeedbackSessionReader(),
      new PrismaFeedbackRepository(),
    );
    const result = await useCase.execute(userId, id);

    return Response.json(toFeedbackResponse(result));
  } catch (error) {
    return toErrorResponse(error, "GET /api/sessions/[id]/feedback");
  }
}
