import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import { getInterviewerVoiceProfile } from "./interviewerVoiceProfiles";

/**
 * Gemini TTS（音声合成）アダプタ。
 *
 * テキスト生成系（geminiModel / Vercel AI SDK）とは別に、TTS の preview モデルは
 * AUDIO modality / voiceConfig を素直に扱えないため生 REST で呼ぶ。返り値は
 * base64 でエンコードされた 24kHz / 16bit / モノラルの PCM 文字列で、クライアントが
 * Web Audio API でデコードして再生する。
 */

/** Gemini TTS モデル ID。 */
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
/** 返却される PCM のサンプルレート（Hz）。クライアントのデコードと一致させる。 */
export const GEMINI_TTS_SAMPLE_RATE = 24000;

/** TTS の設定不備・生成失敗を表す例外。ルートで 502 等に変換する。 */
export class SpeechSynthesisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpeechSynthesisError";
  }
}

/**
 * テキストを読み上げ音声（base64 PCM）に合成して返す。
 * 失敗時は SpeechSynthesisError を投げる（呼び出し側でフォールバックする）。
 */
export async function synthesizeSpeech(
  text: string,
  interviewerType?: InterviewerType,
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new SpeechSynthesisError("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const voiceProfile = getInterviewerVoiceProfile(interviewerType);
  const speechPrompt = `次の「読み上げ本文」だけを日本語で音声化してください。

音声演出: ${voiceProfile.direction}

読み上げ本文:
${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: speechPrompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceProfile.voiceName },
            },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SpeechSynthesisError(
      `Gemini TTS API error: ${res.status} ${detail.slice(0, 200)}`,
    );
  }

  const data: unknown = await res.json();
  const audio = extractInlineAudio(data);
  if (audio === null) {
    throw new SpeechSynthesisError("No audio data in Gemini TTS response");
  }
  return audio;
}

/** Gemini のレスポンス JSON から base64 音声（inlineData.data）を取り出す。 */
function extractInlineAudio(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const candidates = (data as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return null;
  const parts = (candidates[0] as { content?: { parts?: unknown } } | undefined)
    ?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inlineData = (part as { inlineData?: { data?: unknown } }).inlineData;
    if (typeof inlineData?.data === "string") {
      return inlineData.data;
    }
  }
  return null;
}
