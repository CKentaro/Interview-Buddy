/**
 * 評価の4軸（ユビキタス言語: EvaluationAxis）。
 *
 * ドメイン層は技術的詳細から独立させる方針のため、Prisma 生成型
 * （generated/prisma）には依存せず、ドメイン独自の enum として定義する。
 * 値は Prisma スキーマの enum と一致させ、インフラ層での相互変換を 1:1 にする。
 */
export enum EvaluationAxis {
  /** 再現性 */
  REPRODUCIBILITY = "REPRODUCIBILITY",
  /** 価値観 / 判断 */
  VALUES_JUDGMENT = "VALUES_JUDGMENT",
  /** 自己認識 */
  SELF_AWARENESS = "SELF_AWARENESS",
  /** 世界観 / 知的好奇心 */
  WORLDVIEW = "WORLDVIEW",
}
