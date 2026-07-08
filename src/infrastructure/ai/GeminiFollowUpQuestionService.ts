import type {
  FollowUpGenerationContext,
  GeneratedFollowUpQuestion,
  IFollowUpQuestionService,
} from "@/domain/interview/ports/IFollowUpQuestionService";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

type GeminiTextResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const AXIS_LABELS: Record<EvaluationAxis, { label: string; description: string }> = {
  [EvaluationAxis.REPRODUCIBILITY]: {
    label: "再現性",
    description: "過去の行動から、同様の状況で再現できる能力を評価する",
  },
  [EvaluationAxis.VALUES_JUDGMENT]: {
    label: "価値観・判断軸",
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

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }
  return apiKey;
}

function extractText(response: GeminiTextResponse): string {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini response did not include text");
  }

  return text;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const jsonText =
    trimmed.startsWith("```")
      ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
      : trimmed;
  return JSON.parse(jsonText) as unknown;
}

function isGeneratedFollowUpQuestion(
  value: unknown,
): value is GeneratedFollowUpQuestion {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.displayText === "string" &&
    (record.speechText === undefined || typeof record.speechText === "string")
  );
}

async function generateJson(prompt: string): Promise<unknown> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      getApiKey(),
    )}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const body = (await response.json()) as GeminiTextResponse;
  return parseJsonObject(extractText(body));
}

function buildFollowUpPrompt(context: FollowUpGenerationContext): string {
  const axis = AXIS_LABELS[context.axis];
  const history = context.conversationHistory
    .map(
      (pair) =>
        `Q: ${pair.questionText}\nA: ${pair.answerText ?? "（未回答）"}`,
    )
    .join("\n\n");

  return `あなたは就職面接の面接官です。
以下の評価軸に沿って、応募者への深掘り質問を1つ生成してください。

## 評価軸
- 軸名: ${axis.label}
- 意味: ${axis.description}

## 本質問
${context.parentMainQuestionText}

## これまでのやり取り
${history}

## 指示
- 直前の回答が曖昧なら、具体化を促す質問にしてください。
- 直前の回答が十分具体的なら、理由・判断軸・再現性などをさらに一段深掘りしてください。
- 質問は必ず1つだけにしてください。
- 出力は JSON のみで、次の形にしてください。

{
  "displayText": "画面表示用の端的な質問文",
  "speechText": "面接官として自然な会話口調の読み上げ文"
}`;
}

/**
 * IFollowUpQuestionService の Gemini 実装。
 */
export class GeminiFollowUpQuestionService implements IFollowUpQuestionService {
  async generate(
    context: FollowUpGenerationContext,
  ): Promise<GeneratedFollowUpQuestion> {
    const generated = await generateJson(buildFollowUpPrompt(context));
    if (!isGeneratedFollowUpQuestion(generated)) {
      throw new Error("Gemini follow-up response had an invalid shape");
    }
    return generated;
  }
}
