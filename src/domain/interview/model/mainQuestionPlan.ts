import { EvaluationAxis } from "./EvaluationAxis.vo";

/** 本質問 1 問分の出題計画（どの表示順でどの軸を問うか）。 */
export type MainQuestionPlanEntry = {
  displayOrder: number;
  axis: EvaluationAxis;
};

/**
 * 普通の本質問の軸構成と表示順。4軸を1問ずつ扱う。
 *
 * バンク抽選（selectMainQuestions）と求人由来の生成（IMainQuestionGenerationService）
 * の双方がここを参照する。出題方法を切り替えても評価軸の構成が変わらないことが、
 * フィードバックの 4 軸集計が成立する前提になっている。
 */
export const MAIN_QUESTION_AXIS_PLAN: readonly MainQuestionPlanEntry[] = [
  { displayOrder: 1, axis: EvaluationAxis.SELF_AWARENESS },
  { displayOrder: 2, axis: EvaluationAxis.REPRODUCIBILITY },
  { displayOrder: 3, axis: EvaluationAxis.VALUES_JUDGMENT },
  { displayOrder: 4, axis: EvaluationAxis.WORLDVIEW },
];

/** 短めも普通と同じ4軸を扱い、深掘り回数だけを減らす。 */
export const SHORT_MAIN_QUESTION_AXIS_PLAN = MAIN_QUESTION_AXIS_PLAN;

/** 長めは再現性と価値観を2問ずつ扱い、フィードバックの4軸も維持する。 */
export const LONG_MAIN_QUESTION_AXIS_PLAN: readonly MainQuestionPlanEntry[] = [
  { displayOrder: 1, axis: EvaluationAxis.SELF_AWARENESS },
  { displayOrder: 2, axis: EvaluationAxis.REPRODUCIBILITY },
  { displayOrder: 3, axis: EvaluationAxis.REPRODUCIBILITY },
  { displayOrder: 4, axis: EvaluationAxis.VALUES_JUDGMENT },
  { displayOrder: 5, axis: EvaluationAxis.VALUES_JUDGMENT },
  { displayOrder: 6, axis: EvaluationAxis.WORLDVIEW },
];

/** 普通で出題する本質問の数。既存利用との互換用。 */
export const MAIN_QUESTION_COUNT = MAIN_QUESTION_AXIS_PLAN.length;
