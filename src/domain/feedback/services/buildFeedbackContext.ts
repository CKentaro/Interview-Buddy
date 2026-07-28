import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type {
  FeedbackGenerationContext,
  FeedbackQAPair,
} from "@/domain/feedback/ports/IFeedbackService";

/** 評価対象の 1 問分（質問・回答・その質問の主軸）。回答未済は answerText が null。 */
export type FeedbackQARow = {
  primaryAxis: EvaluationAxis | null;
  questionText: string;
  answerText: string | null;
};

/** 軸別評価の対象となる 4 軸（この順で常に 4 件そろえる）。 */
const ALL_AXES: readonly EvaluationAxis[] = [
  EvaluationAxis.REPRODUCIBILITY,
  EvaluationAxis.SELF_AWARENESS,
  EvaluationAxis.VALUES_JUDGMENT,
  EvaluationAxis.WORLDVIEW,
];

/**
 * Q&A 行から {@link FeedbackGenerationContext} を組み立てる純粋関数（副作用なし）。
 *
 * - 未回答（answerText が null）の質問は評価対象から除外する。
 * - 軸別（axisQAPairs）は常に 4 軸ぶんを返す（該当回答が無い軸は空配列）。
 *   → 軸別評価を必ず 4 件生成できるようにするため。
 * - 総評用（allQAPairs）は回答済み全件を displayOrder 順（呼び出し側で整列済み）で持つ。
 */
export function buildFeedbackContext(
  rows: FeedbackQARow[],
  interviewerType: InterviewerType,
): FeedbackGenerationContext {
  const byAxis = new Map<EvaluationAxis, FeedbackQAPair[]>(
    ALL_AXES.map((axis) => [axis, []]),
  );
  const allQAPairs: FeedbackQAPair[] = [];

  for (const row of rows) {
    if (row.answerText === null) {
      continue;
    }
    const pair: FeedbackQAPair = {
      questionText: row.questionText,
      answerText: row.answerText,
    };
    allQAPairs.push(pair);

    const axisPairs = row.primaryAxis && byAxis.get(row.primaryAxis);
    if (axisPairs) {
      axisPairs.push(pair);
    }
  }

  return {
    axisQAPairs: ALL_AXES.map((axis) => ({
      axis,
      pairs: byAxis.get(axis) ?? [],
    })),
    allQAPairs,
    interviewerType,
  };
}
