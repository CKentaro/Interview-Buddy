import { toErrorResponse } from "@/app/api/httpError";
import type { UserMeResponse } from "@/app/api/types";
import { DeleteUserUseCase } from "@/application/user/DeleteUserUseCase";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import type { UserProfile } from "@/domain/user/model/UserProfile";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";
import { requireUser } from "@/lib/auth-guard";

function toUserMeResponse(profile: UserProfile): UserMeResponse {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    image: profile.image,
    totalSessions: profile.totalSessions,
    lastSessionAt: profile.lastSessionAt?.toISOString() ?? null,
  };
}

/** GET /api/users/[id] — 本人のプロフィール＋利用サマリを返す。 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;
    const useCase = new GetUserUseCase(new PrismaUserRepository());
    const profile = await useCase.execute(userId, id);
    return Response.json(toUserMeResponse(profile));
  } catch (error) {
    return toErrorResponse(error, "GET /api/users/[id]");
  }
}

/** DELETE /api/users/[id] — 本人アカウントを削除（退会）する。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;
    const useCase = new DeleteUserUseCase(new PrismaUserRepository());
    await useCase.execute(userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/users/[id]");
  }
}
