import type {
  FeedbackQAPair,
  GeneratedAxisFeedback,
} from "@/domain/feedback/ports/IFeedbackService";
import type { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";

/**
 * フィードバック生成のプロンプト定義。
 *
 * NOTE: 文言・方針は今後の改修が入りやすい箇所。プロンプトはこのファイルに集約し、
 * サービス実装（{@link ./GeminiFeedbackService}）からは builder 関数だけを使う。
 * 軸ラベル・説明は {@link EVALUATION_AXIS_METADATA}（単一の真実源）を参照する。
 *
 * 方針（プロンプト改善の議論より）:
 * - 励まし中心をやめ、率直・具体・引用ベースの指摘に寄せる。良かった点は無理に作らない。
 * - 厳しさ・口調は面接官タイプに連動させる（質問生成と違い、内容の踏み込みも変える）。
 * - 総評は軸別と役割を分け、軸横断の一貫性と「次回やること」に絞って重複を避ける。
 */

/** フィードバックの口調・厳しさ（面接官タイプ別）。 */
const FEEDBACK_TONE_INSTRUCTIONS: Record<InterviewerType, string> = {
  friendly: `- 温かく親しみやすい語りかけで書く。ただし率直さは損なわず、改善点は曖昧にせずはっきり伝える。
- 指摘の後に、応募者が前向きに取り組めるような一言を添えてよい。`,
  neutral: `- 丁寧で落ち着いた、事実ベースの淡々とした語り口で書く。
- 過剰な称賛も過剰な叱責もせず、良い点・改善点をそのままの温度で伝える。`,
  strict: `- 厳しい面接官として、妥協なく踏み込んで指摘する。回答の浅さ・論理の穴・ごまかしは明確に指摘する。
- ふざけた回答や不真面目な回答があれば、面接の場にふさわしくないとはっきり指摘する。
- 威圧・侮辱・人格否定はしない。厳しさは回答内容にのみ向ける。`,
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
  interviewerType: InterviewerType,
): string {
  const info = EVALUATION_AXIS_METADATA[axis];
  return `あなたは面接を担当した面接官です。
応募者の面接での回答を読み、以下の評価軸の観点からフィードバックを書いてください。
これは面接練習サービスであり、応募者が次の面接で実際に改善できるフィードバックが目的です。

## 評価軸
- 軸名: ${info.label}
- この軸が評価するもの: ${info.description}

## 面接でのやり取り（この軸に関連する質問・回答）
${formatQA(pairs)}

## 口調・厳しさ
${FEEDBACK_TONE_INSTRUCTIONS[interviewerType]}

## フィードバック方針
- スコア・点数は一切つけない。
- 励ましではなく、率直で具体的な指摘を中心にする。
- 必ず応募者の実際の発言を引用して指摘する。一般論だけのフィードバックは書かない。
- 良かった点は本当に良かった場合のみ最大2点まで挙げる。無理に作らない。無ければ書かなくてよい。
- この軸の観点で回答に欠けていた要素・弱かった要素を、率直に指摘する。
- 最後に「次の面接で同じ質問をされたら、どう答え方を変えるべきか」を、すぐ実践できる具体的な形で1〜2点伝える。
- 全体300〜500字程度。`;
}

/** 総評のプロンプト。軸別フィードバックの生成後に呼び、指摘の重複を避ける。 */
export function buildOverallCommentPrompt(
  pairs: FeedbackQAPair[],
  axisFeedbacks: GeneratedAxisFeedback[],
  interviewerType: InterviewerType,
): string {
  const axisSection = axisFeedbacks
    .map(
      (feedback) =>
        `### ${EVALUATION_AXIS_METADATA[feedback.axis].label}\n${feedback.comment}`,
    )
    .join("\n\n");

  return `あなたは面接を担当した面接官です。
以下は応募者との面接全体のやり取りと、評価軸ごとに既に伝えたフィードバックです。
面接全体の総評を書いてください。
これは面接練習サービスであり、応募者が次の面接で実際に改善できるフィードバックが目的です。

## 面接でのやり取り（全件・時系列順）
${formatQA(pairs)}

## 軸別に伝えたフィードバック（重複を避けるための参照用）
${axisSection}

## 口調・厳しさ
${FEEDBACK_TONE_INSTRUCTIONS[interviewerType]}

## フィードバック方針
- スコア・点数は一切つけない。
- 軸別フィードバックで既に伝えた個別の指摘は繰り返さない。総評は軸をまたいだ視点に徹する。
- 面接全体を通した印象と、回答間の一貫性（例: 語った価値観と実際の判断エピソードが噛み合っているか、話の軸がぶれていないか）を率直に評価する。
- 最後に「次回の面接までに取り組むべきこと」を2〜3点、具体的な行動として挙げる。応募者が読み終えた瞬間に何をすべきか分かる状態にする。
- 全体300〜500字程度。`;
}
