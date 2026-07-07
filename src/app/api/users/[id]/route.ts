import { NextResponse } from "next/server";
import type { UserMeResponse } from "@/app/api/types";
import { DeleteUserUseCase } from "@/application/user/DeleteUserUseCase";
import { UserNotFoundError } from "@/application/user/errors";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import type { UserProfile } from "@/domain/user/model/UserProfile";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";
import { requireUser, UnauthorizedError } from "@/lib/auth-guard";

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

/**
 * 例外を HTTP ステータスへ変換する。
 * - 未認証 → 401
 * - 非存在／非本人 → 404（秘匿）
 * - それ以外 → 500
 */
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof UserNotFoundError) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    return NextResponse.json(toUserMeResponse(profile));
  } catch (error) {
    return toErrorResponse(error);
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
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
