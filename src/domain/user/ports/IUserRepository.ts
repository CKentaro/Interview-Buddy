import type { CareerPreference } from "../model/CareerPreference.vo";
import type { UserProfile } from "../model/UserProfile";

/** プロフィール更新で書き換える値。渡した項目だけを上書きする。 */
export type UserProfileUpdate = {
  /** 表示名。null は「未設定に戻す」を意味する。 */
  name?: string | null;
  /** 志望設定。null の組は「未設定に戻す」を意味する。 */
  careerPreference?: CareerPreference;
  /** true なら「オンボーディング完了」を記録する（済みなら日時は据え置き）。 */
  completeOnboarding?: boolean;
};

/**
 * ユーザーの永続化に対する契約（リポジトリ・インターフェース）。
 *
 * user は interview / feedback とは別の境界づけられたコンテキスト。
 * ドメイン層が「何ができてほしいか」だけを定義し、実装（Prisma 等）は
 * インフラ層に置く（依存性逆転）。GetUser / UpdateUser / DeleteUser の
 * 各ユースケースで共用する。
 */
export interface IUserRepository {
  /**
   * プロフィール＋志望設定＋利用サマリ（面接回数・直近日時）を取得する。
   * 対象ユーザーが存在しなければ null。
   */
  getProfileWithStats(userId: string): Promise<UserProfile | null>;

  /**
   * オンボーディングを終えているか。画面の誘導判定だけに使うので、
   * 利用サマリを伴う getProfileWithStats より軽い問い合わせで済ませる。
   * 対象ユーザーが存在しなければ null。
   */
  isOnboardingCompleted(userId: string): Promise<boolean | null>;

  /**
   * プロフィール（表示名・志望設定・オンボーディング完了）を更新する。
   * 対象ユーザーが存在しなければ false を返す（例外にしない）。
   */
  updateProfile(userId: string, update: UserProfileUpdate): Promise<boolean>;

  /**
   * ユーザーを削除する（退会）。関連データ（セッション・OAuth アカウント等）は
   * DB のカスケード削除に委ねる。存在しないユーザーの削除は何もしない。
   */
  delete(userId: string): Promise<void>;
}
