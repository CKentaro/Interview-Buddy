import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { JobPostingContext } from "../model/JobPosting.vo";
import type { SelectedQuestion } from "../model/SelectedQuestion.vo";

/** 本質問生成の文脈。 */
export type MainQuestionGenerationContext = {
  /** 抽出済みの求人・企業情報。 */
  jobPosting: JobPostingContext;
  /**
   * 生成する質問の軸と表示順の計画。バンク抽選と同じ構成を渡し、
   * 生成に切り替えても評価軸の構成が変わらないようにする。
   */
  plan: readonly { displayOrder: number; axis: EvaluationAxis }[];
};

/**
 * 求人内容に紐づく本質問を生成する契約（ポート）。
 *
 * バンク抽選（selectMainQuestions）は純粋・同期・決定的なドメインサービスの
 * ままにしたいため、LLM 生成は別のポートとして切り出す。実装はインフラ層。
 */
export interface IMainQuestionGenerationService {
  generate(
    context: MainQuestionGenerationContext,
  ): Promise<SelectedQuestion[]>;
}
