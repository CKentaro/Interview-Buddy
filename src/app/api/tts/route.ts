import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import type { TtsResponse } from "@/app/api/types";
import {
  SpeechSynthesisError,
  synthesizeSpeech,
} from "@/infrastructure/ai/GeminiSpeechSynthesizer";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/** 読み上げ対象テキストの上限。1 問分の読み上げには十分で、TTS コストの上限にもなる。 */
const MAX_TTS_TEXT_LENGTH = 2000;

const ttsSchema = z
  .object({
    text: z.string().min(1).max(MAX_TTS_TEXT_LENGTH),
    sessionId: z.string().min(1),
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
    const userId = await requireUser();

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

    // 音声あり(voiceEnabled=true)かつ本人のセッションのみ合成を許可する。
    // 音声枠の消費はセッション作成時に判定済みで、ここは直接叩きによる回避を防ぐゲート。
    const repository = new PrismaInterviewSessionRepository();
    const allowed = await repository.isVoiceEnabledSessionForUser(
      userId,
      parsed.data.sessionId,
    );
    if (!allowed) {
      return jsonError("音声の利用が許可されていません。", 403);
    }

    const audio = await synthesizeSpeech(parsed.data.text);
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
