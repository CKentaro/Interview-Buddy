import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import type { TtsResponse } from "@/app/api/types";
import { INTERVIEWER_TYPES } from "@/domain/interview/model/InterviewerType.vo";
import {
  SpeechSynthesisError,
  synthesizeSpeech,
} from "@/infrastructure/ai/GeminiSpeechSynthesizer";
import { requireUser } from "@/lib/auth-guard";

const ttsSchema = z
  .object({
    text: z.string().min(1),
    interviewerType: z.enum(INTERVIEWER_TYPES).optional(),
  })
  .strict();

/**
 * POST /api/tts — テキストを読み上げ音声（base64 PCM）に合成して返す。
 *
 * 合成に失敗しても面接進行は止めない前提で、クライアントは 5xx 時に
 * 音声再生を諦めてテキスト表示のままフォールバックする。
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = ttsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Bad Request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const audio = await synthesizeSpeech(
      parsed.data.text,
      parsed.data.interviewerType,
    );
    const response: TtsResponse = { audio };
    return Response.json(response);
  } catch (error) {
    if (error instanceof SpeechSynthesisError) {
      console.error("POST /api/tts failed:", error);
      return jsonError("TTS generation failed", 502);
    }
    return toErrorResponse(error, "POST /api/tts");
  }
}
