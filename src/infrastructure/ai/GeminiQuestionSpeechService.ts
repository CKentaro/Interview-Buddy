import type {
  GenerateQuestionSpeechInput,
  IQuestionSpeechService,
} from "@/domain/interview/ports/IQuestionSpeechService";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

type GeminiTextResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type SpeechResponse = {
  speechText: string;
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

function isSpeechResponse(value: unknown): value is SpeechResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return typeof (value as Record<string, unknown>).speechText === "string";
}

function buildPrompt(input: GenerateQuestionSpeechInput): string {
  return `あなたは就職面接の面接官です。
応募者の直前の回答に軽くリアクションしたうえで、次の質問へ自然につなげる読み上げ文を作成してください。

## 直前のやり取り
Q: ${input.previousQuestionText}
A: ${input.previousAnswerText}

## 次の質問
${input.displayText}

## 指示
- 面接官として自然な会話口調にしてください。
- まず直前の回答を受け止める一言を入れてください。
- 大げさな評価や点数付けはしないでください。
- 出力は JSON のみで、次の形にしてください。

{
  "speechText": "読み上げる発話文"
}`;
}

export class GeminiQuestionSpeechService implements IQuestionSpeechService {
  async generate(input: GenerateQuestionSpeechInput): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
        getApiKey(),
      )}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
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
    const parsed = parseJsonObject(extractText(body));
    if (!isSpeechResponse(parsed)) {
      throw new Error("Gemini speech response had an invalid shape");
    }

    return parsed.speechText;
  }
}
