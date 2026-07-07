import type { AxisFeedback } from "@/domain/feedback/model/AxisFeedback.entity";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { AXIS_TO_PRISMA } from "@/infrastructure/prisma/evaluationAxisMapping";
import type { AxisFeedbackResult } from "./types";

/**
 * 評価軸 → 画面表示用の日本語ラベル。
 * enum を DTO に載せる際の presentation 変換（ドメインは enum のまま保つ）。
 * GET /feedback（3-4）と GET /sessions/[id]（3-9）の両方から使う共有ヘルパ。
 */
export const AXIS_LABELS: Record<EvaluationAxis, string> = {
  [EvaluationAxis.REPRODUCIBILITY]: "再現性",
  [EvaluationAxis.VALUES_JUDGMENT]: "価値観・判断",
  [EvaluationAxis.SELF_AWARENESS]: "自己認識",
  [EvaluationAxis.WORLDVIEW]: "世界観・知的好奇心",
};

/** ドメインの AxisFeedback[] を DTO の AxisFeedbackResult[] に詰め替える（軸→Prisma enum＋ラベル）。 */
export function toAxisFeedbackResults(
  axisFeedbacks: AxisFeedback[],
): AxisFeedbackResult[] {
  return axisFeedbacks.map((a) => ({
    axis: AXIS_TO_PRISMA[a.axis],
    axisLabel: AXIS_LABELS[a.axis],
    comment: a.comment,
  }));
}
