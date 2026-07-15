import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { synthesizeSpeech } from "./GeminiSpeechSynthesizer";

const fetchMock = vi.fn<typeof fetch>();

describe("synthesizeSpeech", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ inlineData: { data: "BASE64PCM" } }] } },
          ],
        }),
        { status: 200 },
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("厳しめの音声名と演出指示をGeminiへ渡す", async () => {
    await expect(synthesizeSpeech("質問です。", "strict")).resolves.toBe(
      "BASE64PCM",
    );

    const init = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: {
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
        };
      };
    };
    expect(
      body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig
        .voiceName,
    ).toBe("Gacrux");
    expect(body.contents[0]?.parts[0]?.text).toContain(
      "経験豊富な男性の面接官",
    );
    expect(body.contents[0]?.parts[0]?.text).toContain("質問です。");
  });
});
