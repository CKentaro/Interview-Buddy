import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import type { UserMeResponse } from "@/app/api/types";
import { DeleteUserUseCase } from "@/application/user/DeleteUserUseCase";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import { UpdateUserProfileUseCase } from "@/application/user/UpdateUserProfileUseCase";
import { DISPLAY_NAME_MAX_LENGTH } from "@/domain/user/model/DisplayName.vo";
import type { UserProfile } from "@/domain/user/model/UserProfile";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";
import { requireUser } from "@/lib/auth-guard";

/** 分類名の想定外に長い値を弾く上限（マスタ照合はドメイン側で行う）。 */
const TAXONOMY_VALUE_MAX_LENGTH = 100;

const taxonomyValue = z
  .string()
  .max(TAXONOMY_VALUE_MAX_LENGTH)
  .nullable()
  .optional();

const updateUserSchema = z
  .object({
    // 上限超過は切り詰めではなく 400。UI 側の maxLength と一致させてある。
    name: z.string().max(DISPLAY_NAME_MAX_LENGTH).nullable().optional(),
    industryMajor: taxonomyValue,
    industryMinor: taxonomyValue,
    jobMajor: taxonomyValue,
    jobMinor: taxonomyValue,
    completeOnboarding: z.boolean().optional(),
  })
  .strict();

function toUserMeResponse(profile: UserProfile): UserMeResponse {
  const { industry, job } = profile.careerPreference;
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    image: profile.image,
    industryMajor: industry?.major ?? null,
    industryMinor: industry?.minor ?? null,
    jobMajor: job?.major ?? null,
    jobMinor: job?.minor ?? null,
    onboardingCompleted: profile.onboardingCompleted,
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

/** PATCH /api/users/[id] — 本人の表示名・志望設定を更新する。 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Bad Request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const useCase = new UpdateUserProfileUseCase(new PrismaUserRepository());
    const profile = await useCase.execute(userId, id, parsed.data);
    return Response.json(toUserMeResponse(profile));
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/users/[id]");
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
