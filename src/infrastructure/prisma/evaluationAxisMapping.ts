import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { EvaluationAxis as PrismaEvaluationAxis } from "@/generated/prisma/enums";

// ── Prisma の enum 値 ⇔ ドメインの enum 値（値は同一だが型を明示的に橋渡しする）──
//
// Prisma 生成型とドメイン型の相互変換を行う単一の真実源。各リポジトリで重複定義せず
// ここを参照する（軸の増減・改名時の同期漏れを防ぐ）。

/** Prisma の enum 値 → ドメインの EvaluationAxis。 */
export const AXIS_TO_DOMAIN: Record<PrismaEvaluationAxis, EvaluationAxis> = {
  REPRODUCIBILITY: EvaluationAxis.REPRODUCIBILITY,
  VALUES_JUDGMENT: EvaluationAxis.VALUES_JUDGMENT,
  SELF_AWARENESS: EvaluationAxis.SELF_AWARENESS,
  WORLDVIEW: EvaluationAxis.WORLDVIEW,
};

/** ドメインの EvaluationAxis → Prisma の enum 値。 */
export const AXIS_TO_PRISMA: Record<EvaluationAxis, PrismaEvaluationAxis> = {
  [EvaluationAxis.REPRODUCIBILITY]: "REPRODUCIBILITY",
  [EvaluationAxis.VALUES_JUDGMENT]: "VALUES_JUDGMENT",
  [EvaluationAxis.SELF_AWARENESS]: "SELF_AWARENESS",
  [EvaluationAxis.WORLDVIEW]: "WORLDVIEW",
};
