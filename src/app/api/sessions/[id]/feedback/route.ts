import type { FeedbackResponse } from "@/app/api/types";
import { toAxisFeedbackResults } from "@/app/api/feedbackPresenter";
import { SessionNotFoundError } from "@/application/feedback/errors";
import { GetFeedbackUseCase } from "@/application/feedback/GetFeedbackUseCase";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";
import { PrismaFeedbackSessionReader } from "@/infrastructure/prisma/PrismaFeedbackSessionReader";
import { requireUser, UnauthorizedError } from "@/lib/auth-guard";

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

    const body: FeedbackResponse =
      result.status === "completed"
        ? {
            status: "completed",
            feedbackId: result.feedback.id,
            overallComment: result.feedback.overallComment,
            axisFeedbacks: toAxisFeedbackResults(result.feedback.axisFeedbacks),
          }
        : { status: result.status };

    return Response.json(body);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof SessionNotFoundError) {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }
    // 想定外の失敗（reader/repository 例外など）。ポーリングで繰り返し叩かれるため、
    // 診断できるようログを残してから 500 を返す。
    console.error("GET /api/sessions/[id]/feedback failed:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
