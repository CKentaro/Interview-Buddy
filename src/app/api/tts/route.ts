import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const TTS_VOICE = "Kore"; // multilingual, works well with Japanese

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let text: string;
  try {
    const body = await request.json();
    text = body.text;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TTS API key not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_VOICE },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[TTS] Gemini API error:", res.status, err);
    return NextResponse.json({ error: "TTS generation failed" }, { status: 502 });
  }

  const data = await res.json();
  const audioData: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioData) {
    console.error("[TTS] No audio data in response:", JSON.stringify(data).slice(0, 300));
    return NextResponse.json({ error: "No audio data returned" }, { status: 502 });
  }

  // Return base64 PCM; client decodes with Web Audio API
  return NextResponse.json({ audio: audioData });
}
