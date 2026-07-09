import type { FeedbackQAPair } from "@/domain/feedback/ports/IFeedbackService";
import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";

/**
 * フィードバック生成のプロンプト定義（PoC からの移植）。
 *
 * NOTE: 文言・方針は今後の改修が入りやすい箇所。プロンプトはこのファイルに集約し、
 * サービス実装（{@link ./GeminiFeedbackService}）からは builder 関数だけを使う。
 * 軸ラベル・説明は {@link EVALUATION_AXIS_METADATA}（単一の真実源）を参照する。
 */

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
  const info = EVALUATION_AXIS_METADATA[axis];
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
