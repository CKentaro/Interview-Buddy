import { createGoogleGenerativeAI } from "@ai-sdk/google";

/** 全 Gemini サービスで共有するモデル ID。 */
export const GEMINI_MODEL = "gemini-2.5-flash-lite";

/**
 * 共有の Gemini モデルを返す（Vercel AI SDK）。
 * API キーは既定の env `GOOGLE_GENERATIVE_AI_API_KEY` を使う。
 * 生成呼び出しは各サービスが `generateText({ model, output, prompt })` で行う。
 */
export function geminiModel(): ReturnType<
  ReturnType<typeof createGoogleGenerativeAI>
> {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google(GEMINI_MODEL);
}
