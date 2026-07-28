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
    description:
      "過去の成功や失敗から得た経験や学びを「型」や教訓として整理し、状況や場面が変わっても安定して成果に繋げられるかを評価する",
  },
  [EvaluationAxis.VALUES_JUDGMENT]: {
    label: "価値観・判断",
    description:
      "物事を選択・評価・決断する際に何を優先しているのか、その判断基準や理由を自分自身の言葉で一貫して語れるかを評価する",
  },
  [EvaluationAxis.SELF_AWARENESS]: {
    label: "自己認識",
    description:
      "主観的な思い込みに留まらず、自分の強み・弱みや特性を、具体的なエピソードや他者からのフィードバックを交えて客観的に把握・説明できているかを評価する",
  },
  [EvaluationAxis.WORLDVIEW]: {
    label: "世界観・知的好奇心",
    description:
      "自分が何に惹かれ、どう行動してきたかという個性や興味のあり方を、自分らしい独自の視点や探究心をもって深掘りできているかを評価する",
  },
};
