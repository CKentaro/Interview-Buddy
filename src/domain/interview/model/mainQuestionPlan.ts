import { EvaluationAxis } from "./EvaluationAxis.vo";

/** 本質問 1 問分の出題計画（どの表示順でどの軸を問うか）。 */
export type MainQuestionPlanEntry = {
  displayOrder: number;
  axis: EvaluationAxis;
};

/**
 * 本質問の軸構成と表示順（固定）。
 *
 * バンク抽選（selectMainQuestions）と求人由来の生成（IMainQuestionGenerationService）
 * の双方がここを参照する。出題方法を切り替えても評価軸の構成が変わらないことが、
 * フィードバックの 4 軸集計が成立する前提になっている。
 */
export const MAIN_QUESTION_AXIS_PLAN: readonly MainQuestionPlanEntry[] = [
  { displayOrder: 1, axis: EvaluationAxis.SELF_AWARENESS },
  { displayOrder: 2, axis: EvaluationAxis.REPRODUCIBILITY },
  { displayOrder: 3, axis: EvaluationAxis.REPRODUCIBILITY },
  { displayOrder: 4, axis: EvaluationAxis.VALUES_JUDGMENT },
  { displayOrder: 5, axis: EvaluationAxis.WORLDVIEW },
];

/** セッションごとに出題する本質問の数。計画から導出する。 */
export const MAIN_QUESTION_COUNT = MAIN_QUESTION_AXIS_PLAN.length;
