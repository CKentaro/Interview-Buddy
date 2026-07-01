import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";

/** 評価対象となる 1 問分の質問と回答の組。 */
export type FeedbackQAPair = {
  questionText: string;
  answerText: string;
};

/** 軸ごとの質問・回答（その軸に属する MainQuestion とその深掘り）。 */
export type AxisQAPairs = {
  axis: EvaluationAxis;
  pairs: FeedbackQAPair[];
};

/** フィードバック生成に渡す文脈。 */
export type FeedbackGenerationContext = {
  /** 軸別の質問・回答（軸別評価の生成に使う）。 */
  axisQAPairs: AxisQAPairs[];
  /** セッション全体の質問・回答（総評の生成に使う）。 */
  allQAPairs: FeedbackQAPair[];
};

/** 生成された 1 軸分の講評。 */
export type GeneratedAxisFeedback = {
  axis: EvaluationAxis;
  comment: string;
};

/** 生成されたフィードバック（永続化前）。 */
export type GeneratedFeedback = {
  overallComment: string;
  axisFeedbacks: GeneratedAxisFeedback[];
};

/**
 * フィードバック（AI 評価）の生成サービスに対する契約（ポート）。
 *
 * 軸別評価・総評の生成を 1 つの契約として表す。実装（Gemini 等）はインフラ層に置く。
 */
export interface IFeedbackService {
  generate(context: FeedbackGenerationContext): Promise<GeneratedFeedback>;
}
