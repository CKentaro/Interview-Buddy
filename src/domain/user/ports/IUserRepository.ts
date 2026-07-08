import type { UserProfile } from "../model/UserProfile";

/**
 * ユーザーの永続化に対する契約（リポジトリ・インターフェース）。
 *
 * user は interview / feedback とは別の境界づけられたコンテキスト。
 * ドメイン層が「何ができてほしいか」だけを定義し、実装（Prisma 等）は
 * インフラ層に置く（依存性逆転）。GetUser / DeleteUser の両ユースケースで共用する。
 */
export interface IUserRepository {
  /**
   * プロフィール＋利用サマリ（面接回数・直近日時）を取得する。
   * 対象ユーザーが存在しなければ null。
   */
  getProfileWithStats(userId: string): Promise<UserProfile | null>;

  /**
   * ユーザーを削除する（退会）。関連データ（セッション・OAuth アカウント等）は
   * DB のカスケード削除に委ねる。存在しないユーザーの削除は何もしない。
   */
  delete(userId: string): Promise<void>;
}
