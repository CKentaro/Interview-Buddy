import { after } from "next/server";
import { jsonError, toErrorResponse } from "@/app/api/httpError";
import { GenerateFeedbackUseCase } from "@/application/feedback/GenerateFeedbackUseCase";
import { GeminiFeedbackService } from "@/infrastructure/ai/GeminiFeedbackService";
import { PrismaFeedbackContextProvider } from "@/infrastructure/prisma/PrismaFeedbackContextProvider";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";
import { PrismaFeedbackSessionReader } from "@/infrastructure/prisma/PrismaFeedbackSessionReader";
import { requireUser } from "@/lib/auth-guard";

/**
 * POST /api/sessions/[id]/feedback/generate
 *
 * フィードバック生成を非同期で起動する。所有・完了・二重生成をこの Handler で
 * 事前チェックし、生成本体は `after()` でレスポンス後に実行する。
 * - 202: 生成開始 / 200: 既に存在 / 401: 未認証 / 404: 非所有・非存在 / 409: 面接未完了
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    const sessionReader = new PrismaFeedbackSessionReader();
    const feedbackRepository = new PrismaFeedbackRepository();

    // 所有チェック（非所有・非存在は 404 秘匿）。
    const sessionState = await sessionReader.findOwnedSessionState(userId, id);
    if (sessionState === null) {
      return jsonError("Not Found", 404);
    }

    // 面接が未完了なら生成できない（409）。
    if (sessionState.endedAt === null) {
      return jsonError("Interview not completed", 409);
    }

    // 二重生成ガード（既存なら 200）。after の多重起動対策は UseCase 側でも行う。
    const existing = await feedbackRepository.findBySessionId(id);
    if (existing !== null) {
      return Response.json({ message: "Feedback already exists" }, { status: 200 });
    }

    const useCase = new GenerateFeedbackUseCase(
      new PrismaFeedbackContextProvider(),
      new GeminiFeedbackService(),
      feedbackRepository,
    );

    // 生成はレスポンス後に非同期実行。失敗は伝搬させずログのみ（ポーリングで failed 判定される）。
    after(async () => {
      try {
        await useCase.execute(id);
      } catch (error) {
        console.error(
          `Feedback generation failed for session ${id}:`,
          error,
        );
      }
    });

    return new Response(null, { status: 202 });
  } catch (error) {
    return toErrorResponse(error, "POST /api/sessions/[id]/feedback/generate");
  }
}
