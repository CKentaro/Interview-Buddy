import { toCareerPreference } from "@/domain/user/model/CareerPreference.vo";
import type { UserProfile } from "@/domain/user/model/UserProfile";
import type {
  IUserRepository,
  UserProfileUpdate,
} from "@/domain/user/ports/IUserRepository";
import { prisma } from "@/lib/prisma";

/**
 * IUserRepository の Prisma 実装。
 * ドメイン層が定義したインターフェースを Prisma で実装する（依存性逆転）。
 *
 * DB は志望設定を平坦な 4 列で持つ。ドメインの組（TaxonomyPair）との
 * 変換はこの層の責務（インフラ層で enum / 表現を吸収する規約）。
 */
export class PrismaUserRepository implements IUserRepository {
  async getProfileWithStats(userId: string): Promise<UserProfile | null> {
    // プロフィール本体・総数・直近セッションを並列取得する。
    const [user, totalSessions, lastSession] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          industryMajor: true,
          industryMinor: true,
          jobMajor: true,
          jobMinor: true,
          onboardedAt: true,
        },
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
      // 保存後にマスタから消えた分類が残っていても、ここで「未設定」に倒れる。
      careerPreference: toCareerPreference(user),
      onboardingCompleted: user.onboardedAt !== null,
      totalSessions,
      lastSessionAt: lastSession?.startedAt ?? null,
    };
  }

  async isOnboardingCompleted(userId: string): Promise<boolean | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardedAt: true },
    });
    return user === null ? null : user.onboardedAt !== null;
  }

  async updateProfile(
    userId: string,
    update: UserProfileUpdate,
  ): Promise<boolean> {
    const { name, careerPreference, completeOnboarding } = update;
    // updateMany は対象が無くても throw せず件数を返す（存在しないユーザーは false）。
    // completeOnboarding は onboardedAt に「今」を書くだけ。到達できるのは未完了の
    // ユーザーだけ（/onboarding は完了済みならホームへ戻す）なので、実質 1 度しか書かれない。
    const { count } = await prisma.user.updateMany({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(careerPreference !== undefined
          ? {
              industryMajor: careerPreference.industry?.major ?? null,
              industryMinor: careerPreference.industry?.minor ?? null,
              jobMajor: careerPreference.job?.major ?? null,
              jobMinor: careerPreference.job?.minor ?? null,
            }
          : {}),
        ...(completeOnboarding === true ? { onboardedAt: new Date() } : {}),
      },
    });
    return count > 0;
  }

  async delete(userId: string): Promise<void> {
    // deleteMany は対象が無くても throw しない（冪等）。ポート契約「存在しない
    // ユーザーの削除は何もしない」を満たし、二重 DELETE でも 204 を返せる。
    // 関連（InterviewSession / Account / Session 等）は schema の onDelete: Cascade で削除される。
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}
