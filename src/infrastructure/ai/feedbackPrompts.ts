import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { FeedbackQAPair } from "@/domain/feedback/ports/IFeedbackService";

/**
 * フィードバック生成のプロンプト定義（PoC からの移植）。
 *
 * NOTE: 文言・方針は今後の改修が入りやすい箇所。プロンプトはこのファイルに集約し、
 * サービス実装（{@link ./GeminiFeedbackService}）からは builder 関数だけを使う。
 */

/** 軸ごとの表示ラベルと評価観点（プロンプトに埋め込む）。 */
const AXIS_PROMPT_INFO: Record<
  EvaluationAxis,
  { label: string; description: string }
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

function formatQA(pairs: FeedbackQAPair[]): string {
  return pairs
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText}`)
    .join("\n\n");
}

/** 軸別評価のプロンプト。 */
export function buildAxisEvaluationPrompt(
  axis: EvaluationAxis,
  pairs: FeedbackQAPair[],
): string {
  const info = AXIS_PROMPT_INFO[axis];
  return `あなたはキャリアコーチングの専門家です。
応募者の面接での回答を読み、以下の評価軸の観点からフィードバックを提供してください。

## 評価軸
- 軸名: ${info.label}
- この軸が評価するもの: ${info.description}

## 面接でのやり取り（この軸に関連する質問・回答）
${formatQA(pairs)}

## フィードバック方針
- スコア・点数は一切つけない
- 定性的・コーチングスタイルで書く
- 励ましのトーン
- 良かった点を1〜2点、具体的なエピソードや言葉を引用しつつ伝える
- 改善できる点を1点、建設的な言い方で伝える
- 全体200〜400字程度`;
}

/** 総評のプロンプト。 */
export function buildOverallCommentPrompt(pairs: FeedbackQAPair[]): string {
  return `あなたはキャリアコーチングの専門家です。
以下は応募者との面接全体のやり取りです。面接全体の総評を書いてください。

## 面接でのやり取り（全件・時系列順）
${formatQA(pairs)}

## フィードバック方針
- スコア・点数は一切つけない
- 定性的・コーチングスタイルで書く
- 励ましのトーン
- 応募者の全体的な強み・印象を伝える
- 今後の成長や面接改善への期待・アドバイスを添える
- 全体300〜500字程度`;
}
