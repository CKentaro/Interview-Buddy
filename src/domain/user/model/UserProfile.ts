/**
 * ユーザープロフィール（ユビキタス言語: UserProfile）。
 *
 * プロフィール画面が必要とする基本情報＋利用サマリ（面接回数・直近日時）を
 * まとめた読み取り用のドメインモデル。永続化（Prisma の行）から独立させる。
 */
export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** そのユーザーが作成した面接セッションの総数。 */
  totalSessions: number;
  /** 直近セッションの開始日時。1 件も無ければ null。 */
  lastSessionAt: Date | null;
};
