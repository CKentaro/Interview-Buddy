import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * 全 Gemini サービスで共有するモデル ID。
 *
 * 2.5 系は「no longer available to new users」として提供終了が進行中で、既存プロジェクト以外
 * からは 404 になる（本番のキーが該当し、深掘り質問の生成が 502 になっていた）。
 * バージョン固定のため `-latest` エイリアスは使わない。
 */
export const GEMINI_MODEL = "gemini-3.1-flash-lite";

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
