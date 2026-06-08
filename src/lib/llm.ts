import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { EvaluationAxis } from "@/generated/prisma/enums";

// フィードバック生成用
export type AxisQAPair = {
  questionText: string;
  answerText: string;
};

export type QAPair = {
  questionText: string;
  answerText: string | null; // 回答未済の場合は null
};

export type FollowUpContext = {
  parentMainQuestionText: string;
  axis: EvaluationAxis;
  conversationHistory: QAPair[]; // displayOrder 昇順
};

export type FollowUpResult = {
  displayText: string; // DBに保存する質問文
  speechText: string;  // TTS用（レスポンスのみ、DB保存しない）
};

const AXIS_LABELS: Record<EvaluationAxis, { label: string; description: string }> = {
  REPRODUCIBILITY: {
    label: "再現性",
    description: "過去の行動から、同様の状況で再現できる能力を評価する",
  },
  VALUES_JUDGMENT: {
    label: "価値観・判断",
    description: "意思決定の基準や倫理観・優先順位を評価する",
  },
  SELF_AWARENESS: {
    label: "自己認識",
    description: "強み・弱み・成長課題の理解度を評価する",
  },
  WORLDVIEW: {
    label: "世界観・知的好奇心",
    description: "社会や仕事への関心・視野の広さを評価する",
  },
};

const followUpSchema = z.object({
  displayText: z.string(),
  speechText: z.string(),
});

function buildPrompt(context: FollowUpContext): string {
  const axisInfo = AXIS_LABELS[context.axis];
  const history = context.conversationHistory
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText ?? "（未回答）"}`)
    .join("\n\n");

  return `あなたは就職面接の面接官です。
以下の評価軸に沿って、応募者への深掘り質問を1つ生成してください。

## 評価軸
- 軸名: ${axisInfo.label}
- 意味: ${axisInfo.description}

## 本質問
${context.parentMainQuestionText}

## これまでのやり取り（時系列順）
${history}

## 指示
- 直前の回答を読み、以下の判断を行ってください：
  (a) 回答が曖昧・具体性に欠ける場合 → その点を明確化する質問を生成
  (b) 回答が十分具体的な場合 → 回答内容をさらに一段深掘りする質問を生成
- 評価軸に沿った質問にすること
- 質問は必ず1つだけ生成すること

## 出力フィールドの使い分け（重要）
- **displayText**: 画面に表示する質問文。
  - 質問の核心だけを端的に書く。30文字以内が理想。
  - 余計なつなぎ言葉（「なるほど」「ありがとうございます」等）は含めない。
  - 例: 「その判断をした理由を教えてください。」
- **speechText**: 音声読み上げ用のテキスト。
  - 面接官として自然な会話口調で書く。
  - 「なるほど、」「もう少し詳しく聞かせてください。」等の導入を含めてよい。
  - displayText の内容を自然な発話として再表現する。`;
}

const axisEvaluationSchema = z.object({ comment: z.string() });
const overallCommentSchema = z.object({ overallComment: z.string() });

function buildAxisEvaluationPrompt(
  axis: EvaluationAxis,
  qaList: AxisQAPair[],
): string {
  const axisInfo = AXIS_LABELS[axis];
  const qa = qaList
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText}`)
    .join("\n\n");

  return `あなたはキャリアコーチングの専門家です。
応募者の面接での回答を読み、以下の評価軸の観点からフィードバックを提供してください。

## 評価軸
- 軸名: ${axisInfo.label}
- この軸が評価するもの: ${axisInfo.description}

## 面接でのやり取り（この軸に関連する質問・回答）
${qa}

## フィードバック方針
- スコア・点数は一切つけない
- 定性的・コーチングスタイルで書く
- 励ましのトーン
- 良かった点を1〜2点、具体的なエピソードや言葉を引用しつつ伝える
- 改善できる点を1点、建設的な言い方で伝える
- 全体200〜400字程度`;
}

function buildOverallCommentPrompt(allQaList: AxisQAPair[]): string {
  const qa = allQaList
    .map((pair) => `Q: ${pair.questionText}\nA: ${pair.answerText}`)
    .join("\n\n");

  return `あなたはキャリアコーチングの専門家です。
以下は応募者との面接全体のやり取りです。面接全体の総評を書いてください。

## 面接でのやり取り（全件・時系列順）
${qa}

## フィードバック方針
- スコア・点数は一切つけない
- 定性的・コーチングスタイルで書く
- 励ましのトーン
- 応募者の全体的な強み・印象を伝える
- 今後の成長や面接改善への期待・アドバイスを添える
- 全体300〜500字程度`;
}

function createGemini() {
  return createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

export async function generateAxisEvaluation(
  axis: EvaluationAxis,
  qaList: AxisQAPair[],
): Promise<{ comment: string }> {
  const google = createGemini();
  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    output: Output.object({ schema: axisEvaluationSchema }),
    prompt: buildAxisEvaluationPrompt(axis, qaList),
  });
  return result.output;
}

export async function generateOverallComment(
  allQaList: AxisQAPair[],
): Promise<{ overallComment: string }> {
  const google = createGemini();
  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    output: Output.object({ schema: overallCommentSchema }),
    prompt: buildOverallCommentPrompt(allQaList),
  });
  return result.output;
}

export async function generateFollowUpQuestion(
  context: FollowUpContext,
): Promise<FollowUpResult> {
  const google = createGemini();

  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    output: Output.object({ schema: followUpSchema }),
    prompt: buildPrompt(context),
  });

  return result.output;
}
