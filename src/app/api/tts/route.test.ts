import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const routeMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }
  class SpeechSynthesisError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "SpeechSynthesisError";
    }
  }
  return {
    UnauthorizedError,
    SpeechSynthesisError,
    requireUser: vi.fn<() => Promise<string>>(),
    synthesizeSpeech: vi.fn<(text: string) => Promise<string>>(),
    isVoiceEnabledSessionForUser: vi.fn<() => Promise<boolean>>(),
  };
});

vi.mock("@/lib/auth-guard", () => ({
  UnauthorizedError: routeMocks.UnauthorizedError,
  requireUser: routeMocks.requireUser,
}));

vi.mock("@/infrastructure/ai/GeminiSpeechSynthesizer", () => ({
  SpeechSynthesisError: routeMocks.SpeechSynthesisError,
  synthesizeSpeech: routeMocks.synthesizeSpeech,
}));

vi.mock("@/infrastructure/prisma/PrismaInterviewSessionRepository", () => ({
  PrismaInterviewSessionRepository: class PrismaInterviewSessionRepository {
    isVoiceEnabledSessionForUser = routeMocks.isVoiceEnabledSessionForUser;
  },
}));

/** text と sessionId を持つ既定の正常ボディ。 */
function body(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ text: "hi", sessionId: "session-1", ...overrides });
}

function postRequest(raw: string): Request {
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw,
  });
}

describe("POST /api/tts", () => {
  beforeEach(() => {
    routeMocks.requireUser.mockReset();
    routeMocks.requireUser.mockResolvedValue("user-1");
    routeMocks.synthesizeSpeech.mockReset();
    routeMocks.isVoiceEnabledSessionForUser.mockReset();
    routeMocks.isVoiceEnabledSessionForUser.mockResolvedValue(true);
  });

  it("未認証なら 401 を返す", async () => {
    routeMocks.requireUser.mockRejectedValue(new routeMocks.UnauthorizedError());

    const response = await POST(postRequest(body()));

    expect(response.status).toBe(401);
    expect(routeMocks.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("不正 JSON なら 400 を返す", async () => {
    const response = await POST(postRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("text が空ならバリデーションエラー 400 を返す", async () => {
    const response = await POST(postRequest(body({ text: "" })));

    expect(response.status).toBe(400);
    expect(routeMocks.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("sessionId が無ければバリデーションエラー 400 を返す", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ text: "こんにちは" })),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("音声ありセッションでなければ 403 を返す（合成しない）", async () => {
    routeMocks.isVoiceEnabledSessionForUser.mockResolvedValue(false);

    const response = await POST(postRequest(body({ text: "こんにちは" })));

    expect(response.status).toBe(403);
    expect(routeMocks.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it("合成に成功すれば base64 audio を返す", async () => {
    routeMocks.synthesizeSpeech.mockResolvedValue("BASE64PCM");

    const response = await POST(postRequest(body({ text: "こんにちは" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ audio: "BASE64PCM" });
    expect(routeMocks.synthesizeSpeech).toHaveBeenCalledWith("こんにちは");
    expect(routeMocks.isVoiceEnabledSessionForUser).toHaveBeenCalledWith(
      "user-1",
      "session-1",
    );
  });

  it("合成に失敗すれば 502 を返す（テキスト表示にフォールバックさせる）", async () => {
    routeMocks.synthesizeSpeech.mockRejectedValue(
      new routeMocks.SpeechSynthesisError("boom"),
    );

    const response = await POST(postRequest(body()));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "TTS generation failed",
    });
  });
});
