"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LcMic, LcArrowUp, LcAlert } from "@/components/ui/icons";
import type { AnswerResponse, NextQuestionResponse, QuestionResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

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

/* ── Speech Recognition (Web Speech API) ── */

type SpeechResultAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechResultAlt; length: number };
type SpeechResultList = { length: number; [i: number]: SpeechResult };
type SpeechRecognitionEventLike = { resultIndex: number; results: SpeechResultList };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ── AI presence ── */
function AIPresence({ state }: { state: "idle" | "speaking" | "thinking" }) {
  return (
    <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {state === "idle" && (
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-neutral-300)" }} />
      )}
      {state === "thinking" && (
        <>
          <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-accent-200)", animation: "ib-breathe-ring 2s ease-out infinite" }} />
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-accent-400)", animation: "ib-breathe 2s ease-in-out infinite" }} />
        </>
      )}
      {state === "speaking" && (
        <span style={{ display: "flex", alignItems: "center", gap: 5, height: 40 }}>
          {[0, 0.12, 0.24, 0.36, 0.48].map((d, i) => (
            <span key={i} style={{ width: 6, height: 40, background: "var(--color-accent-500)", borderRadius: 3, display: "inline-block", animation: `ib-wave 0.9s ease-in-out ${d}s infinite` }} />
          ))}
        </span>
      )}
    </div>
  );
}

/* ── Abort dialog ── */
function AbortModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">面接を中断しますか？</div>
        <div className="dialog-body">ここまでの回答とフィードバックは保存されません。中断すると、この面接はやり直しになります。</div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>続ける</button>
          <button className="btn btn-primary" onClick={onConfirm}>中断する</button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function LivePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"preparing" | "ready">("preparing");

  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [orbState, setOrbState] = useState<"idle" | "speaking" | "thinking">("speaking");
  const [sending, setSending] = useState(false);
  const [showAbort, setShowAbort] = useState(false);
  const [error, setError] = useState("");

  const taRef = useRef<HTMLTextAreaElement>(null);
  // Guard against React 18 Strict Mode double-invocation of useEffect in dev
  const initRan = useRef(false);

  // ── Speech-to-text (Web Speech API) ──
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const committedTextRef = useRef("");
  const listeningRef = useRef(false);
  const suppressResultRef = useRef(false);
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSttSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      listeningRef.current = false;
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const stopRecognition = () => {
    listeningRef.current = false;
    suppressResultRef.current = false;
    if (resyncTimerRef.current) { clearTimeout(resyncTimerRef.current); resyncTimerRef.current = null; }
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const handleManualEdit = (value: string) => {
    setText(value);
    if (!recording) return;
    committedTextRef.current = value;
    suppressResultRef.current = true;
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      resyncTimerRef.current = null;
      suppressResultRef.current = false;
      if (listeningRef.current) recognitionRef.current?.abort();
    }, 350);
  };

  const startRecognition = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) { setSttSupported(false); return; }

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;

    committedTextRef.current = text ? text.replace(/\s+$/, "") + " " : "";

    rec.onresult = (e) => {
      if (suppressResultRef.current) return;
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) committedTextRef.current += final;
      setText(committedTextRef.current + interim);
    };
    rec.onerror = (ev) => {
      if (ev.error !== "no-speech" && ev.error !== "aborted") {
        listeningRef.current = false;
        setRecording(false);
      }
    };
    rec.onend = () => {
      if (listeningRef.current) {
        try { rec.start(); } catch { listeningRef.current = false; setRecording(false); }
      } else {
        setRecording(false);
      }
    };

    recognitionRef.current = rec;
    listeningRef.current = true;
    try {
      rec.start();
      setRecording(true);
    } catch {
      listeningRef.current = false;
      setRecording(false);
    }
  };

  const toggleRecording = () => { if (recording) stopRecognition(); else startRecognition(); };

  // Load from sessionStorage, pre-fetch TTS if voice is enabled
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    const raw = sessionStorage.getItem("ib-session");
    if (!raw) { router.replace("/home"); return; }
    const stored: StoredSession = JSON.parse(raw);
    if (stored.sessionId !== sessionId) { router.replace("/home"); return; }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestion(stored.question);
    setVoiceEnabled(stored.voiceEnabled);
    setQuestionNumber(stored.questionNumber);

    if (!stored.voiceEnabled) {
      setStatus("ready");
      setTimeout(() => setOrbState("idle"), 600);
      return;
    }

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
  }, [text]);

  const canSend = text.trim().length > 0;

  const handleSend = async () => {
    if (sending || !question) return;
    if (recording) stopRecognition();
    setSending(true);
    setOrbState("thinking");
    setError("");

    const answerText = text.trim();

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answerText, voiceEnabled }),
      });
      if (!res.ok) throw new Error(`${res.status}`);

      const data: AnswerResponse = await res.json();

      if (data.isSessionComplete) {
        stopCurrentAudio();
        router.push(`/interview/${sessionId}/feedback`);
        return;
      }

      const next = data.nextQuestion as NextQuestionResponse;
      const speechText = next.speechText ?? next.text;

      if (voiceEnabled) {
        const buf = await prepareTTS(speechText);
        setQuestion(next);
        setQuestionNumber((n) => n + 1);
        setText("");
        setOrbState("speaking");
        setSending(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (buf) await playAudioBuffer(buf);
        else speakWebSpeech(speechText);
        setTimeout(() => setOrbState("idle"), 800);
      } else {
        setQuestion(next);
        setQuestionNumber((n) => n + 1);
        setText("");
        setOrbState("speaking");
        setSending(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setTimeout(() => setOrbState("idle"), 800);
      }
    } catch (e) {
      console.error(e);
      setError("回答を送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。");
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

  const aiStateLabel = sending
    ? "次の質問を考えています…"
    : { idle: "あなたの回答をお待ちしています", thinking: "次の質問を考えています…", speaking: "質問を話しています" }[orbState];

  // ── Preparing screen ──
  if (status === "preparing" || !question) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-bg)", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-accent-200)", animation: "ib-breathe-ring 2.2s ease-out infinite" }} />
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-accent-400)", animation: "ib-breathe 2.2s ease-in-out infinite" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-jp)" }}>面接の準備をしています…</div>
        <p style={{ margin: 0, fontSize: 13, color: muted(55), maxWidth: "34ch", fontFamily: "var(--font-jp)" }}>AI が最初の質問を用意しています。もう少しだけお待ちください。</p>
      </div>
    );
  }

  const sendActive = canSend && !sending;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      {/* minimal top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jp)" }}>質問 {questionNumber} 問目</span>
          <span style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>・ 音声 {voiceEnabled ? "ON" : "OFF"}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowAbort(true)} style={{ fontSize: 12 }}>面接を中断する</button>
      </header>

      {/* main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 24 }}>
        <div style={{ height: "100%", width: "min(640px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <h2 key={question.id} style={{ margin: 0, fontSize: 24, lineHeight: 1.6, textAlign: "center", fontFamily: "var(--font-jp)", animation: "ib-fade-up .4s ease both" }}>{question.text}</h2>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <AIPresence state={sending ? "thinking" : orbState} />
              <div style={{ fontSize: 13, fontWeight: 600, color: muted(70), fontFamily: "var(--font-jp)" }}>{aiStateLabel}</div>
            </div>

            {error && (
              <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-accent-100)" }}>
                <span style={{ flex: "none", marginTop: 2, color: "var(--color-accent-700)" }}><LcAlert size={16} /></span>
                <div style={{ fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.7, flex: 1, fontFamily: "var(--font-jp)" }}>{error}</div>
                <button className="btn btn-ghost" onClick={() => setError("")} style={{ fontSize: 12, flex: "none" }}>再送信</button>
              </div>
            )}
          </div>

          {/* composer */}
          <div style={{ width: "100%", paddingBottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", gap: 6, background: "var(--color-bg)", boxShadow: "var(--shadow-md)", borderRadius: "var(--radius-lg)", padding: "8px 8px 8px 22px" }}>
              <textarea
                ref={taRef}
                rows={1}
                value={text}
                onChange={(e) => handleManualEdit(e.target.value)}
                placeholder={recording ? "聞き取っています…" : "回答を入力するか、マイクで話してください"}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (sendActive) handleSend(); } }}
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", resize: "none", font: "inherit", fontFamily: "var(--font-jp)", fontSize: 15, lineHeight: 1.5, padding: "12px 0", maxHeight: 200, overflowY: "auto", color: "var(--color-text)" }}
              />
              {sttSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  title={recording ? "停止" : "マイクで入力"}
                  aria-pressed={recording}
                  style={{ all: "unset", cursor: "pointer", flex: "none", width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: recording ? "var(--color-accent-600)" : muted(55), transition: "background .15s ease" }}
                >
                  <LcMic size={19} />
                </button>
              )}
              <button
                type="button"
                onClick={handleSend}
                disabled={!sendActive}
                style={{ all: "unset", cursor: sendActive ? "pointer" : "not-allowed", flex: "none", width: 44, height: 44, borderRadius: "50%", background: sendActive ? "var(--color-text)" : "var(--color-neutral-400)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", opacity: sending ? 0.7 : 1 }}
              >
                {sending ? (
                  <span style={{ width: 15, height: 15, border: "2px solid color-mix(in srgb, #fff 40%, transparent)", borderTopColor: "#fff", borderRadius: "50%", animation: "ib-spin .8s linear infinite" }} />
                ) : (
                  <LcArrowUp size={18} />
                )}
              </button>
            </div>
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--color-accent-700)", fontFamily: "var(--font-jp)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent-600)", animation: "ib-rec-pulse 1s ease-in-out infinite" }} />
                <span>録音中です。もう一度マイクをタップすると停止します。</span>
              </div>
            )}
            {!sttSupported && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ flex: "none", marginTop: 2, color: muted(50) }}><LcAlert size={14} /></span>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: muted(55), fontFamily: "var(--font-jp)" }}>お使いのブラウザは音声入力に対応していません。テキストでご回答ください。</div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAbort && <AbortModal onCancel={() => setShowAbort(false)} onConfirm={handleAbort} />}
    </div>
  );
}
