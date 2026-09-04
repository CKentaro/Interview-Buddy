import type { CareerPreference } from "./CareerPreference.vo";

/**
 * ユーザープロフィール（ユビキタス言語: UserProfile）。
 *
 * プロフィール画面が必要とする基本情報＋志望設定＋利用サマリ（面接回数・直近日時）を
 * まとめた読み取り用のドメインモデル。永続化（Prisma の行）から独立させる。
 */
export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** 志望業界・志望職種。オンボーディングはスキップ可なので未設定もありうる。 */
  careerPreference: CareerPreference;
  /**
   * 初回のプロフィール確認（オンボーディング）を終えているか。
   * false の間だけ /onboarding へ誘導する。スキップでも true になる。
   */
  onboardingCompleted: boolean;
  /** そのユーザーが作成した面接セッションの総数。 */
  totalSessions: number;
  /** 直近セッションの開始日時。1 件も無ければ null。 */
  lastSessionAt: Date | null;
};
