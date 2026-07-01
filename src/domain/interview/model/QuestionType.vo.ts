/**
 * 質問種別（ユビキタス言語: MainQuestion / FollowUpQuestion）。
 *
 * ドメイン独自の enum として定義する（Prisma 生成型に依存しない）。
 * 値は Prisma スキーマの enum と一致させる。
 */
export enum QuestionType {
  /** 本質問（セッションで出題される大問・5問固定） */
  MAIN = "MAIN",
  /** 深掘り質問（大問への深掘り・最大2回） */
  FOLLOW_UP = "FOLLOW_UP",
}
