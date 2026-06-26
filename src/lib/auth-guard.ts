import { auth } from "@/auth";

/**
 * 認可ヘルパー（規約）。
 *
 * API Route / Server Action の先頭で必ず呼び、ログイン中ユーザーの id を得る。
 * 未ログインなら例外を投げる。返り値の userId は Prisma クエリの where に必ず
 * 含め、他人のデータにアクセスできないよう userId スコープで絞ること。
 *
 * @example
 *   const userId = await requireUser();
 *   const session = await prisma.interviewSession.findFirst({
 *     where: { id, userId }, // 本人のデータのみ
 *   });
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}

/** 認証されていないことを表す例外。API 側で 401 に変換して使う。 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
