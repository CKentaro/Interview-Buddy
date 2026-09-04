import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { MainQuestionPlanEntry } from "../model/mainQuestionPlan";
import type { SelectedQuestion } from "../model/SelectedQuestion.vo";
import { MainQuestionSource } from "../model/SelectedQuestion.vo";

/** 引き継ぎ元セッションの本質問 1 問分。 */
export type PreviousMainQuestion = {
  content: string;
  displayOrder: number;
  primaryAxis: EvaluationAxis | null;
};

/**
 * 過去セッションの本質問を、そのまま今回の出題として引き継ぐドメインサービス。
 * 「同じ設定でもう一度」で、大問だけを前回と揃えるために使う（深掘りは回答次第で
 * 変わるため引き継がない）。
 *
 * 引き継げるのは、軸の並びが今回の出題計画と完全に一致するときだけ。一致しない
 * （面接の長さを変えた・軸構成の改訂前に作られた古いセッション）場合は null を返し、
 * 呼び出し側でバンク抽選へ落とす。フィードバックの4軸集計は計画どおりの軸構成が
 * 前提のため、ここで並びを崩してまで引き継ぐ価値はない。
 */
export function reuseMainQuestions(
  previous: readonly PreviousMainQuestion[],
  plan: readonly MainQuestionPlanEntry[],
): SelectedQuestion[] | null {
  if (previous.length !== plan.length) {
    return null;
  }
  const ordered = [...previous].sort((a, b) => a.displayOrder - b.displayOrder);

  const reused: SelectedQuestion[] = [];
  for (const [index, entry] of plan.entries()) {
    const question = ordered[index]!;
    if (question.primaryAxis !== entry.axis || question.content.trim() === "") {
      return null;
    }
    reused.push({
      // バンク由来かどうかは永続化していないため、引き継ぎでは常に null。
      bankId: null,
      source: MainQuestionSource.REUSED,
      displayText: question.content,
      axis: entry.axis,
      displayOrder: entry.displayOrder,
    });
  }
  return reused;
}
