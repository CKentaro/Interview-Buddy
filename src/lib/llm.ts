import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { EvaluationAxis } from "@/generated/prisma/enums";

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
- 面接官として自然な口調で書くこと。「なるほど」「もう少し詳しく」等のつなぎ言葉で始めてもよい
- 質問は必ず1つだけ生成すること`;
}

export async function generateFollowUpQuestion(
  context: FollowUpContext,
): Promise<FollowUpResult> {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const result = await generateText({
    model: google("gemini-2.5-flash-lite"),
    output: Output.object({ schema: followUpSchema }),
    prompt: buildPrompt(context),
  });

  return result.output;
}
