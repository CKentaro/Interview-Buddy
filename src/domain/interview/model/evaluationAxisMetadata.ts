import { EvaluationAxis } from "./EvaluationAxis.vo";

/** 評価軸のメタデータ（表示ラベルと評価観点の説明）。 */
export type EvaluationAxisMetadata = {
  /** 画面表示・プロンプト共通の日本語ラベル。 */
  label: string;
  /** その軸が評価するものの説明（プロンプトに埋め込む）。 */
  description: string;
};

/**
 * 評価軸ごとのメタデータの単一の真実源。
 *
 * 表示用ラベル（DTO の axisLabel）とプロンプト用の説明を 1 か所に集約する。
 * presentation（feedbackPresenter）とプロンプト（feedbackPrompts / Gemini 実装）は
 * ここを参照し、ラベルの表記ゆれ・重複定義を避ける。
 */
export const EVALUATION_AXIS_METADATA: Record<
  EvaluationAxis,
  EvaluationAxisMetadata
> = {
  [EvaluationAxis.REPRODUCIBILITY]: {
    label: "再現性",
    description: "過去の行動から、同様の状況で再現できる能力を評価する",
  },
  [EvaluationAxis.VALUES_JUDGMENT]: {
    label: "価値観・判断",
    description: "意思決定の基準や倫理観・優先順位を評価する",
  },
  [EvaluationAxis.SELF_AWARENESS]: {
    label: "自己認識",
    description: "強み・弱み・成長課題の理解度を評価する",
  },
  [EvaluationAxis.WORLDVIEW]: {
    label: "世界観・知的好奇心",
    description: "社会や仕事への関心・視野の広さを評価する",
  },
};
