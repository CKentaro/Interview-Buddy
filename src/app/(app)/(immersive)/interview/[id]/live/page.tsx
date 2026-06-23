"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { IconMic, IconSend, IconClose, IconStop } from "@/components/ui/icons";
import type { AnswerResponse, NextQuestionResponse, QuestionResponse } from "@/types/api";

/* ── Types ── */
type CurrentQuestion = {
  id: string;
  type: string;
  text: string;
  speechText?: string;
};

type StoredSession = {
  sessionId: string;
  voiceEnabled: boolean;
  question: QuestionResponse;
  questionNumber: number;
};

/* ── Gemini TTS ── */

// PCM specs returned by Gemini TTS API
const PCM_SAMPLE_RATE = 24000;

let _audioCtx: AudioContext | null = null;
let _currentSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
  }
  return _audioCtx;
}

function stopCurrentAudio() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch { /* already stopped */ }
    _currentSource = null;
  }
}

/** Fetch TTS audio and decode into an AudioBuffer (returns null on error). */
async function prepareTTS(text: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) { console.warn("[TTS] API error", res.status); return null; }

    const { audio } = await res.json() as { audio: string };
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    const buf = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i]! / 32768;
    return buf;
  } catch (e) {
    console.warn("[TTS] Prepare error:", e);
    return null;
  }
}

/** Play a pre-loaded AudioBuffer immediately. */
async function playAudioBuffer(buf: AudioBuffer): Promise<void> {
  stopCurrentAudio();
  try {
    const ctx = getAudioContext();
    // Always resume — may be suspended after page navigation or inactivity
    if (ctx.state !== "running") await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    _currentSource = src;
  } catch (e) {
    console.warn("[TTS] Play error:", e);
  }
}

/** Fallback: browser Web Speech API (no quota limits). */
function speakWebSpeech(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "ja-JP";
  utt.rate = 0.92;
  window.speechSynthesis.speak(utt);
}

/**
 * Try Gemini TTS first; fall back to Web Speech API if the API
 * fails (quota exhausted, network error, etc.).
 */
async function speak(text: string): Promise<void> {
  const buf = await prepareTTS(text);
  if (buf) {
    await playAudioBuffer(buf);
  } else {
    // Gemini TTS unavailable → browser fallback
    console.info("[TTS] Falling back to Web Speech API");
    speakWebSpeech(text);
  }
}

/* ── AI Orb ── */
function AIOrb({ state }: { state: "idle" | "speaking" | "thinking" }) {
  return (
    <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {state === "speaking" && [0, 0.4, 0.8].map((d, i) => (
        <span key={i} style={{ position: "absolute", inset: 0, borderRadius: 999, border: "1px solid var(--teal)", animation: `ripple 2.2s ${d}s ease-out infinite` }} />
      ))}
      <div style={{
        width: 80, height: 80, borderRadius: 999, background: "var(--ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        animation: state === "thinking" ? "thinking 0.9s ease-in-out infinite" : "breathe 3.2s ease-in-out infinite",
        boxShadow: state === "speaking"
          ? "0 0 0 6px color-mix(in oklch, var(--teal) 18%, transparent), 0 8px 24px rgba(11,23,51,0.25)"
          : "0 8px 24px rgba(11,23,51,0.18)",
        transition: "box-shadow .4s ease",
      }}>
        <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
          <circle cx="12" cy="13" r="2.2" fill="var(--bg)" />
          <circle cx="20" cy="13" r="2.2" fill="var(--teal)" />
          {state === "thinking"
            ? <path d="M11 21h10" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" />
            : <path d="M11 20c1.4 1.4 3.1 2 5 2s3.6-.6 5-2" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" fill="none" />}
        </svg>
        <span style={{ position: "absolute", bottom: 4, right: 4, width: 12, height: 12, borderRadius: 999, background: state === "thinking" ? "var(--ink-4)" : "var(--teal)", border: "2px solid var(--bg)", display: "inline-block" }} />
      </div>
    </div>
  );
}

/* ── Thinking Overlay (shown while the next question's audio is being prepared) ── */
function ThinkingOverlay() {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center", padding: "0 24px", animation: "fadeUp .4s ease" }}>
      {/* enlarged thinking orb */}
      <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {[0, 0.5, 1].map((d, i) => (
          <span key={i} style={{ position: "absolute", inset: 0, borderRadius: 999, border: "1px solid var(--teal)", animation: `ripple 2.4s ${d}s ease-out infinite` }} />
        ))}
        <div style={{ width: 80, height: 80, borderRadius: 999, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", animation: "thinking 0.9s ease-in-out infinite", boxShadow: "0 0 0 6px color-mix(in oklch, var(--teal) 16%, transparent), 0 8px 24px rgba(11,23,51,0.2)" }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <circle cx="12" cy="13" r="2.2" fill="var(--bg)" />
            <circle cx="20" cy="13" r="2.2" fill="var(--teal)" />
            <path d="M11 21h10" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* text */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: "0 0 10px", fontFamily: "var(--font-noto-jp), sans-serif" }}>
          次の質問を準備しています…
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.8 }}>
          AIがあなたの回答を踏まえて考えています。
        </p>
      </div>

      {/* animated dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span key={i} style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--teal)", animation: `bounce 1.2s ${d}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Voice Recorder ── */
function VoiceRecorder({ recording, onToggle }: { recording: boolean; onToggle: () => void }) {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 40 }, () => 0.3));
  useEffect(() => {
    if (!recording) { setBars(Array.from({ length: 40 }, () => 0.3)); return; }
    const t = setInterval(() => setBars(Array.from({ length: 40 }, () => 0.25 + Math.random() * 0.75)), 180);
    return () => clearInterval(t);
  }, [recording]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: "24px 28px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16 }}>
      <button onClick={onToggle} style={{ width: 64, height: 64, borderRadius: 999, background: recording ? "var(--warn)" : "var(--ink)", color: "var(--bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: recording ? "0 0 0 8px color-mix(in oklch, var(--warn) 18%, transparent)" : "0 6px 18px rgba(11,23,51,0.2)", border: "none", cursor: "pointer", transition: "all .25s ease" }}>
        {recording ? <IconStop size={18} /> : <IconMic size={22} />}
      </button>
      <div style={{ flex: 1, maxWidth: 360, height: 36, display: "flex", alignItems: "center", gap: 2 }}>
        {bars.map((h, i) => <span key={i} style={{ display: "inline-block", flex: 1, height: `${h * 100}%`, background: recording ? (i % 5 === 0 ? "var(--teal)" : "var(--ink-2)") : "var(--line-strong)", borderRadius: 1, transition: "height .18s ease", minWidth: 2 }} />)}
      </div>
      <div style={{ fontSize: 11, color: recording ? "var(--warn)" : "var(--ink-4)", fontFamily: "var(--font-noto-jp), sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {recording && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--warn)", animation: "bounce 0.9s ease-in-out infinite" }} />}
        {recording ? "録音中" : "停止中"}
      </div>
    </div>
  );
}

/* ── Abort Modal ── */
function AbortModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(11,23,51,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeUp .2s ease" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, padding: "32px 36px", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(11,23,51,0.25)" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--warn)", marginBottom: 12 }}>— CONFIRM</div>
        <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: "0 0 10px", fontFamily: "var(--font-noto-jp), sans-serif" }}>面接を中断しますか？</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.85, color: "var(--ink-3)", margin: "0 0 24px", fontFamily: "var(--font-noto-jp), sans-serif" }}>
          ここまでの回答は保存されません。フィードバックも作成されません。
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "11px 18px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>面接を続ける</button>
          <button onClick={onConfirm} style={{ padding: "11px 18px", background: "var(--warn)", color: "white", border: "none", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>中断してHOMEへ戻る</button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LivePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  // "preparing" = waiting for TTS fetch (initial load or between questions)
  // "ready"     = show the interview screen
  const [status, setStatus] = useState<"preparing" | "ready">("preparing");
  const [preparingLabel, setPreparingLabel] = useState("面接を準備中です。");
  const [preparingSubLabel, setPreparingSubLabel] = useState<string>(
    "AI音声の準備をしています。\n少しお待ちください…"
  );

  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);

  const [mode, setMode] = useState<"text" | "voice">("text");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [orbState, setOrbState] = useState<"idle" | "speaking" | "thinking">("speaking");
  const [sending, setSending] = useState(false);
  const [showAbort, setShowAbort] = useState(false);
  const [error, setError] = useState("");

  const taRef = useRef<HTMLTextAreaElement>(null);
  // Guard against React 18 Strict Mode double-invocation of useEffect in dev
  const initRan = useRef(false);

  // Load from sessionStorage, pre-fetch TTS if voice is enabled
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    const raw = sessionStorage.getItem("ib-session");
    if (!raw) { router.replace("/home"); return; }
    const stored: StoredSession = JSON.parse(raw);
    if (stored.sessionId !== sessionId) { router.replace("/home"); return; }

    setQuestion(stored.question);
    setVoiceEnabled(stored.voiceEnabled);
    setQuestionNumber(stored.questionNumber);

    if (!stored.voiceEnabled) {
      // Voice OFF → show interview immediately
      setStatus("ready");
      setTimeout(() => setOrbState("idle"), 600);
      return;
    }

    // Voice ON → fetch and buffer the first question's audio before revealing the screen
    const speechText = stored.question.speechText ?? stored.question.text;
    prepareTTS(speechText).then(async (buf) => {
      setStatus("ready");
      setOrbState("speaking");
      if (buf) {
        await playAudioBuffer(buf);
      } else {
        speakWebSpeech(speechText);
      }
      setTimeout(() => setOrbState("idle"), 800);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 200) + "px";
    }
  }, [text, mode]);

  const canSend = mode === "text" ? text.trim().length > 0 : hasRecorded && !recording;

  const handleSend = async () => {
    if (sending || !question) return;
    setSending(true);
    setOrbState("thinking");
    setError("");

    // For voice mode, use the text placeholder since we don't have real STT yet
    const answerText = mode === "text" ? text.trim() : "（音声回答）";

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answerText, voiceEnabled }),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const data: AnswerResponse = await res.json();

      if (data.isSessionComplete) {
        // Stop TTS and navigate to feedback
        stopCurrentAudio();
        router.push(`/interview/${sessionId}/feedback`);
        return;
      }

      const next = data.nextQuestion as NextQuestionResponse;
      const speechText = next.speechText ?? next.text;

      if (voiceEnabled) {
        // Voice ON: keep the current "sending" UI while TTS is being fetched.
        // orbState stays "thinking" so the user sees the AI is still working.
        const buf = await prepareTTS(speechText);

        // TTS ready (or failed) → reveal next question and play simultaneously
        setQuestion(next);
        setQuestionNumber((n) => n + 1);
        setText("");
        setRecording(false);
        setHasRecorded(false);
        setOrbState("speaking");
        setSending(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (buf) await playAudioBuffer(buf);
        else speakWebSpeech(speechText);
        setTimeout(() => setOrbState("idle"), 800);
      } else {
        // Voice OFF → transition immediately
        setQuestion(next);
        setQuestionNumber((n) => n + 1);
        setText("");
        setRecording(false);
        setHasRecorded(false);
        setOrbState("speaking");
        setSending(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setOrbState("idle"), 800);
      }
    } catch (e) {
      console.error(e);
      setError("回答の送信に失敗しました。もう一度お試しください。");
      setOrbState("idle");
      setSending(false);
    }
  };

  // 中断：途中まで作成されたセッションを削除し、データを残さずHOMEへ戻る
  const handleAbort = async () => {
    stopCurrentAudio();
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    } catch (e) {
      console.error("セッションの削除に失敗しました", e);
    }
    sessionStorage.removeItem("ib-session");
    router.push("/home");
  };

  // ── Preparing screen (shown while initial TTS is being fetched) ──
  if (status === "preparing" || !question) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: 0 }}>
        {/* faint glow */}
        <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(ellipse 600px 400px at 50% 40%, color-mix(in oklch, var(--teal) 7%, transparent), transparent 70%)" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center", padding: "0 24px" }}>
          {/* animated orb */}
          <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {[0, 0.5, 1].map((d, i) => (
              <span key={i} style={{ position: "absolute", inset: 0, borderRadius: 999, border: "1px solid var(--teal)", animation: `ripple 2.4s ${d}s ease-out infinite` }} />
            ))}
            <div style={{ width: 64, height: 64, borderRadius: 999, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 3s ease-in-out infinite", boxShadow: "0 0 0 6px color-mix(in oklch, var(--teal) 16%, transparent), 0 8px 24px rgba(11,23,51,0.2)" }}>
              <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                <circle cx="12" cy="13" r="2.2" fill="var(--bg)" />
                <circle cx="20" cy="13" r="2.2" fill="var(--teal)" />
                <path d="M11 20c1.4 1.4 3.1 2 5 2s3.6-.6 5-2" stroke="var(--bg)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* text */}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: "0 0 10px", fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {preparingLabel}
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.8, whiteSpace: "pre-line" }}>
              {preparingSubLabel}
            </p>
          </div>

          {/* animated dots */}
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--teal)", animation: `bounce 1.2s ${d}s ease-in-out infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Logo size={22} nameSize={14} />
          <div style={{ height: 16, width: 1, background: "var(--line-strong)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {voiceEnabled ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--teal-soft)", border: "1px solid color-mix(in oklch, var(--teal) 30%, transparent)", borderRadius: 999, fontSize: 11, color: "var(--teal-deep)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M4 8a4 4 0 0 0 8 0M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                AI音声 ON
              </span>
            ) : (
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: 0.5 }}>AI音声 OFF</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", letterSpacing: 0.5 }}>
            Q {String(questionNumber).padStart(2, "0")}
          </span>
        </div>

        <button onClick={() => setShowAbort(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", padding: "6px 10px", background: "none", border: "none", cursor: "pointer" }}>
          <IconClose size={12} />面接を中断する
        </button>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 40px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(ellipse 700px 400px at 50% 30%, color-mix(in oklch, var(--teal) 8%, transparent), transparent 70%)" }} />
        <div style={{ position: "relative", width: "100%", maxWidth: 1100 }}>
          {sending ? (
            <ThinkingOverlay />
          ) : (
            <div key={question.id} style={{ animation: "fadeUp .4s ease", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <AIOrb state={orbState} />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 999, background: "var(--teal)" }} />
                <span className="mono" style={{ letterSpacing: 0.5 }}>{question.type}</span>
              </div>
              <h2 style={{ fontSize: "clamp(22px, 2.4vw, 30px)", lineHeight: 1.55, letterSpacing: -0.3, fontWeight: 700, margin: 0, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", textAlign: "center", maxWidth: "100%" }}>
                {question.text}
              </h2>
            </div>
          )}
          {error && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "var(--warn-bg)", border: "1px solid var(--warn-line)", borderRadius: 10, fontSize: 13, color: "var(--warn)", textAlign: "center", fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Answer Dock */}
      <div style={{ background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "20px 40px 28px" }}>
        <div aria-hidden={sending} style={{ maxWidth: 820, margin: "0 auto", opacity: sending ? 0.45 : 1, pointerEvents: sending ? "none" : "auto", transition: "opacity .3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "inline-flex", padding: 4, background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999 }}>
              {(["text", "voice"] as const).map((m) => {
                const on = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink-3)", borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", border: "none", cursor: "pointer", transition: "all .15s ease" }}>
                    {m === "text" ? "テキスト" : "音声"}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {mode === "text" ? "回答は要点を絞って、自分の言葉で。" : "深呼吸してから、ご自身のペースで話してください。"}
            </div>
          </div>

          {mode === "text" ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, padding: "12px 14px 12px 18px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "0 1px 2px rgba(11,23,51,0.04)" }}>
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ここに回答を入力してください…"
                rows={2}
                style={{ flex: 1, resize: "none", border: "none", background: "transparent", fontSize: 15, lineHeight: 1.8, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", minHeight: 56, maxHeight: 200, padding: "4px 0", outline: "none" }}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (canSend && !sending) handleSend(); } }}
              />
              <SendBtn canSend={canSend} sending={sending} onClick={handleSend} />
            </div>
          ) : (
            <div>
              <VoiceRecorder recording={recording} onToggle={() => { setRecording((r) => { if (r) setHasRecorded(true); return !r; }); }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <SendBtn canSend={canSend} sending={sending} onClick={handleSend} />
              </div>
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            {mode === "text" ? "⌘ + Enter で送信" : "マイク権限が必要です"}
          </div>
        </div>
      </div>

      {showAbort && (
        <AbortModal
          onCancel={() => setShowAbort(false)}
          onConfirm={handleAbort}
        />
      )}
    </div>
  );
}

function SendBtn({ canSend, sending, onClick }: { canSend: boolean; sending: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={!canSend || sending} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", background: (!canSend || sending) ? "var(--line-strong)" : "var(--ink)", color: (!canSend || sending) ? "var(--ink-4)" : "var(--bg)", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: (!canSend || sending) ? "not-allowed" : "pointer", border: "none", transition: "background .2s ease", whiteSpace: "nowrap" }}>
      {sending ? (
        <span style={{ display: "inline-flex", gap: 3 }}>
          {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: 999, background: "var(--bg)", animation: `bounce 0.9s ${d}s ease-in-out infinite`, display: "inline-block" }} />)}
        </span>
      ) : (
        <><IconSend size={13} />回答を送信する</>
      )}
    </button>
  );
}
