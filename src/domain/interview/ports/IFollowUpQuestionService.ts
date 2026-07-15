import type { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { InterviewerType } from "../model/InterviewerType.vo";
import type { QuestionAnswerPair } from "./IInterviewSessionRepository";

/** 深掘り質問を生成するための文脈。 */
export type FollowUpGenerationContext = {
  /** 親 MainQuestion の質問文。 */
  parentMainQuestionText: string;
  /** 親 MainQuestion の評価軸。 */
  axis: EvaluationAxis;
  /** これまでの質問と回答のやりとり（displayOrder 昇順）。 */
  conversationHistory: QuestionAnswerPair[];
  /** 質問内容ではなく、口調・深掘り姿勢を切り替えるためのタイプ。 */
  interviewerType: InterviewerType;
};

/** 生成された深掘り質問。 */
export type GeneratedFollowUpQuestion = {
  /** 画面表示用の質問文。 */
  displayText: string;
  /** 読み上げ用文章（任意）。 */
  speechText?: string;
};

/**
 * 深掘り質問の生成サービスに対する契約（ポート）。
 * 実装（Gemini 等）はインフラ層に置く。
 */
export interface IFollowUpQuestionService {
  generate(
    context: FollowUpGenerationContext,
  ): Promise<GeneratedFollowUpQuestion>;
}
