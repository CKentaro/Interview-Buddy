import type { UserProfile } from "@/domain/user/model/UserProfile";
import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { prisma } from "@/lib/prisma";

/**
 * IUserRepository の Prisma 実装。
 * ドメイン層が定義したインターフェースを Prisma で実装する（依存性逆転）。
 */
export class PrismaUserRepository implements IUserRepository {
  async getProfileWithStats(userId: string): Promise<UserProfile | null> {
    // プロフィール本体・総数・直近セッションを並列取得する。
    const [user, totalSessions, lastSession] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      }),
      prisma.interviewSession.count({ where: { userId } }),
      prisma.interviewSession.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      }),
    ]);

    if (user === null) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      totalSessions,
      lastSessionAt: lastSession?.startedAt ?? null,
    };
  }

  async delete(userId: string): Promise<void> {
    // deleteMany は対象が無くても throw しない（冪等）。ポート契約「存在しない
    // ユーザーの削除は何もしない」を満たし、二重 DELETE でも 204 を返せる。
    // 関連（InterviewSession / Account / Session 等）は schema の onDelete: Cascade で削除される。
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}
