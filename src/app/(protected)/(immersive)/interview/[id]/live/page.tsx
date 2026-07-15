"use client";

import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { LcMic, LcArrowUp, LcAlert } from "@/components/ui/icons";
import type {
  AnswerResponse,
  NextQuestionResponse,
  QuestionResponse,
  SessionDetailResponse,
} from "@/app/api/types";
import { MAIN_QUESTION_COUNT } from "@/domain/interview/services/selectMainQuestions";
import { MAX_FOLLOW_UP_DEPTH } from "@/domain/interview/services/decideNextStep";
import { MAX_ANSWER_LENGTH } from "@/domain/interview/model/answerConstraints";
import { MAX_VOICE_SESSIONS_PER_DAY } from "@/domain/interview/model/voiceRateLimit";
import {
  DEFAULT_INTERVIEWER_TYPE,
  resolveInterviewerType,
  type InterviewerType,
} from "@/domain/interview/model/InterviewerType.vo";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

/** 1 セッションの総質問数 = 本質問 5 問 × (本質問 1 + 深掘り最大 2)。 */
const TOTAL_QUESTION_COUNT = MAIN_QUESTION_COUNT * (1 + MAX_FOLLOW_UP_DEPTH);

/* ── 入力フォームの寸法 ──
   textarea は 3 行までは高さが伸び、それ以降はフォーム内スクロールに切り替える。
   高さ計算に使うため、実際に適用する font-size / line-height / padding と必ず揃えること。 */
const TA_FONT_SIZE = 15;
const TA_LINE_HEIGHT = 1.5;
const TA_PADDING_Y = 12;
const TA_MAX_ROWS = 3;
const TA_ROW_HEIGHT = TA_FONT_SIZE * TA_LINE_HEIGHT;
const TA_MAX_HEIGHT = TA_ROW_HEIGHT * TA_MAX_ROWS + TA_PADDING_Y * 2;
const COMPOSER_PADDING_Y = 8;
/** フォーム下のヒント行（gap 込み）。 */
const COMPOSER_HINT_SPACE = 26;
const FOOTER_PADDING_BOTTOM = 24;
/** 3 行まで伸びたフォームが収まる高さ。main はこの分だけ下を空けておく。 */
const COMPOSER_MAX_SPACE =
  TA_MAX_HEIGHT + COMPOSER_PADDING_Y * 2 + COMPOSER_HINT_SPACE + FOOTER_PADDING_BOTTOM;

/** 残りこの文字数を切ったら文字数カウンタを警告色にする。 */
const ANSWER_LENGTH_WARN_AT = MAX_ANSWER_LENGTH - 200;

/* ── Types ── */
type CurrentQuestion = {
  id: string;
  text: string;
  speechText?: string;
};

type StoredSession = {
  sessionId: string;
  voiceEnabled: boolean;
  question: QuestionResponse;
  questionNumber: number;
  interviewerType?: string;
  voiceLimited?: boolean;
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

/**
 * Fetch TTS audio and decode into an AudioBuffer (returns null on error).
 * sessionId は /api/tts のゲート（音声あり かつ 本人のセッションか）に必須。
 * interviewerType は面接官タイプごとの声色の切り替えに使う。
 */
async function prepareTTS(
  text: string,
  sessionId: string,
  interviewerType: InterviewerType,
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sessionId, interviewerType }),
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

/**
 * Fallback: browser Web Speech API.
 * Gemini の合成に失敗したときだけ使う。音声枠の消費判定はセッション作成時に済んでおり、
 * こちらはブラウザ内で完結するため枠の抜け道にはならない（面接官ごとの声色は再現できない）。
 */
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

/* ── AI presence ──
   状態は「ユーザー回答中（idle）」と「次の質問を考え中（thinking）」の 2 つだけ。 */
function AIPresence({ state }: { state: "idle" | "thinking" }) {
  return (
    <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {state === "idle" ? (
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-neutral-300)" }} />
      ) : (
        <>
          <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-accent-200)", animation: "ib-breathe-ring 2s ease-out infinite" }} />
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-accent-400)", animation: "ib-breathe 2s ease-in-out infinite" }} />
        </>
      )}
    </div>
  );
}

/* ── Abort dialog ── */
function AbortModal({ onCancel, onConfirm, aborting }: { onCancel: () => void; onConfirm: () => void; aborting: boolean }) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">面接を中断しますか？</div>
        <div className="dialog-body">ここまでの回答とフィードバックは保存されません。中断すると、この面接はやり直しになります。</div>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={aborting}>続ける</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={aborting}>{aborting ? "中断しています…" : "中断する"}</button>
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
  const [interviewerType, setInterviewerType] = useState<InterviewerType>(DEFAULT_INTERVIEWER_TYPE);
  // 音声を要求したのに本日の枠が尽きていた場合のみ true（テキスト進行への切り替えを通知する）。
  const [voiceLimited, setVoiceLimited] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);

  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAbort, setShowAbort] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [error, setError] = useState("");

  const taRef = useRef<HTMLTextAreaElement>(null);

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
    const clamped = value.slice(0, MAX_ANSWER_LENGTH);
    setText(clamped);
    if (!recording) return;
    committedTextRef.current = clamped;
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
      // 口述でも上限を超えないよう、確定テキスト・表示ともに切り詰める。
      if (final) {
        committedTextRef.current = (committedTextRef.current + final).slice(0, MAX_ANSWER_LENGTH);
      }
      setText((committedTextRef.current + interim).slice(0, MAX_ANSWER_LENGTH));
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

  // sessionStorage から復元し、音声ありなら最初の質問の TTS を先に用意する。
  // sessionStorage が無い（リロード等）場合はセッション詳細から未回答の質問を復元する（音声なし）。
  // ref ガードは使わない: StrictMode の mount→cleanup→mount で in-flight の prepare が
  // キャンセルされたまま再実行されず固まるのを避けるため、cleanup の cancelled フラグだけで制御する。
  useEffect(() => {
    let cancelled = false;

    const raw = typeof window === "undefined" ? null : sessionStorage.getItem("ib-session");
    const stored: StoredSession | null = raw ? JSON.parse(raw) : null;

    if (stored && stored.sessionId === sessionId) {
      const storedType = resolveInterviewerType(stored.interviewerType);
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuestion(stored.question);
      setVoiceEnabled(stored.voiceEnabled);
      setInterviewerType(storedType);
      setVoiceLimited(stored.voiceLimited ?? false);
      setQuestionNumber(stored.questionNumber);

      if (!stored.voiceEnabled) {
        setStatus("ready");
        /* eslint-enable react-hooks/set-state-in-effect */
        return;
      }

      const speechText = stored.question.speechText ?? stored.question.text;
      void prepareTTS(speechText, sessionId, storedType).then(async (buf) => {
        if (cancelled) return;
        setStatus("ready");
        if (buf) await playAudioBuffer(buf);
        else speakWebSpeech(speechText);
      });
      return () => {
        cancelled = true;
        stopCurrentAudio();
      };
    }

    // sessionStorage 無し（リロード等）→ セッション詳細から未回答の質問を復元する（音声なし）。
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((detail: SessionDetailResponse) => {
        if (cancelled) return;
        if (detail.endedAt) {
          router.replace(`/interview/${sessionId}/feedback`);
          return;
        }
        const unanswered = detail.questions.find((q) => q.answer === null);
        if (!unanswered) {
          router.replace(`/interview/${sessionId}/feedback`);
          return;
        }
        setQuestion({ id: unanswered.id, text: unanswered.content });
        setInterviewerType(resolveInterviewerType(detail.interviewerType));
        setQuestionNumber(detail.questions.length);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setError("セッション情報の取得に失敗しました。");
        setStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  // 面接開始時と質問が切り替わったタイミングで入力欄へフォーカスを戻す
  useEffect(() => {
    if (status === "ready") taRef.current?.focus();
  }, [status, question?.id]);

  // Resize textarea（3 行を超えたら伸ばさず、フォーム内スクロールに任せる）
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, TA_MAX_HEIGHT) + "px";
    }
  }, [text]);

  const canSend = text.trim().length > 0;

  /**
   * Shift + Enter で改行、Enter で送信。
   * 日本語入力の変換確定も Enter を使うため、変換中（isComposing）は送信しない。
   */
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (canSend && !sending) handleSend();
  };

  const handleSend = async () => {
    if (sending || !question) return;
    if (recording) stopRecognition();
    setSending(true);
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
        sessionStorage.removeItem("ib-session");
        router.push(`/interview/${sessionId}/feedback`);
        return;
      }

      const next = data.nextQuestion as NextQuestionResponse;
      const speechText = next.speechText ?? next.text;
      // 読み上げありのときは音声を用意し終えてから次の質問へ切り替える
      const buf = voiceEnabled ? await prepareTTS(speechText, sessionId, interviewerType) : null;

      setQuestion(next);
      setQuestionNumber((n) => n + 1);
      setText("");
      setSending(false);
      // リロードしても同じ質問から続けられるよう、進行状態を保存し直す。
      sessionStorage.setItem("ib-session", JSON.stringify({
        sessionId,
        question: next,
        questionNumber: questionNumber + 1,
        voiceEnabled,
        interviewerType,
        voiceLimited,
      }));
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (voiceEnabled) {
        if (buf) await playAudioBuffer(buf);
        else speakWebSpeech(speechText);
      }
    } catch (e) {
      console.error(e);
      setError("回答を送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。");
      setSending(false);
    }
  };

  // 中断：途中まで作成されたセッションを削除し、データを残さず HOME へ戻る。
  // 破棄は取り消せないため、確認ダイアログを経てから実行する。
  const handleAbort = async () => {
    if (aborting) return;
    if (recording) stopRecognition();
    setAborting(true);
    stopCurrentAudio();
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status}`);
      sessionStorage.removeItem("ib-session");
      router.replace("/home");
    } catch (e) {
      console.error("セッションの削除に失敗しました", e);
      setAborting(false);
      setShowAbort(false);
      setError("面接を中断できませんでした。もう一度お試しください。");
    }
  };

  const aiStateLabel = sending
    ? "次の質問を考えています…"
    : "あなたの回答をお待ちしています";

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
  const nearLimit = text.length >= ANSWER_LENGTH_WARN_AT;

  return (
    <div style={{ position: "relative", height: "100dvh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      {/* minimal top bar */}
      <header style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jp)" }}>
            質問 {questionNumber} / {TOTAL_QUESTION_COUNT} 問
          </span>
          <span aria-hidden style={{ width: 96, height: 4, borderRadius: 2, background: "var(--color-neutral-300)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", width: `${(questionNumber / TOTAL_QUESTION_COUNT) * 100}%`, background: "var(--color-accent-500)", borderRadius: 2, transition: "width .4s ease" }} />
          </span>
          <span style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>・ 読み上げ {voiceEnabled ? "ON" : "OFF"}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowAbort(true)} style={{ fontSize: 12 }}>面接を中断する</button>
      </header>

      {/* main：フォームが伸びても再レイアウトされないよう、下にフォームの最大高ぶんを常に確保する */}
      <main style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `24px 24px ${COMPOSER_MAX_SPACE}px`, gap: 24 }}>
        <div style={{ width: "min(640px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {voiceLimited && (
            <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
              <span style={{ flex: "none", marginTop: 2, color: muted(50) }}><LcAlert size={14} /></span>
              <div style={{ fontSize: 12.5, color: muted(65), lineHeight: 1.7, fontFamily: "var(--font-jp)" }}>
                本日の音声利用枠（1日{MAX_VOICE_SESSIONS_PER_DAY}回）は使用済みのため、テキストのみで進行します。
              </div>
            </div>
          )}

          <h2 key={question.id} style={{ margin: 0, fontSize: 24, lineHeight: 1.6, textAlign: "center", fontFamily: "var(--font-jp)", animation: "ib-fade-up .4s ease both" }}>{question.text}</h2>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <AIPresence state={sending ? "thinking" : "idle"} />
            <div style={{ fontSize: 13, fontWeight: 600, color: muted(70), fontFamily: "var(--font-jp)" }}>{aiStateLabel}</div>
          </div>

          {error && (
            <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-accent-100)" }}>
              <span style={{ flex: "none", marginTop: 2, color: "var(--color-accent-700)" }}><LcAlert size={16} /></span>
              <div style={{ fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.7, flex: 1, fontFamily: "var(--font-jp)" }}>{error}</div>
              <button className="btn btn-ghost" onClick={() => setError("")} style={{ fontSize: 12, flex: "none" }}>閉じる</button>
            </div>
          )}
        </div>
      </main>

      {/* composer：画面下に固定。フロー外に置くことで、行が増えても main 側は動かない */}
      <footer style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", padding: "0 24px 24px", pointerEvents: "none" }}>
        <div style={{ width: "min(640px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div style={{ width: "100%", display: "flex", alignItems: "flex-end", gap: 6, background: "var(--color-bg)", boxShadow: "var(--shadow-md)", borderRadius: "var(--radius-lg)", padding: "8px 8px 8px 22px" }}>
            <textarea
              ref={taRef}
              rows={1}
              value={text}
              maxLength={MAX_ANSWER_LENGTH}
              onChange={(e) => handleManualEdit(e.target.value)}
              placeholder={recording ? "聞き取っています…" : "回答を入力するか、マイクで話してください"}
              onKeyDown={handleKeyDown}
              style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", resize: "none", font: "inherit", fontFamily: "var(--font-jp)", fontSize: TA_FONT_SIZE, lineHeight: TA_LINE_HEIGHT, padding: `${TA_PADDING_Y}px 0`, maxHeight: TA_MAX_HEIGHT, overflowY: "auto", color: "var(--color-text)" }}
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

          {/* ヒント行：左に操作ヒント／録音状態、右に文字数カウンタ */}
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {recording ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--color-accent-700)", fontFamily: "var(--font-jp)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent-600)", animation: "ib-rec-pulse 1s ease-in-out infinite" }} />
                <span>録音中です。もう一度マイクをタップすると停止します。</span>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: muted(40), fontFamily: "var(--font-jp)" }}>
                Shift + Enter で改行・Enter で送信
              </div>
            )}
            {text.length > 0 && (
              <div style={{ flex: "none", fontSize: 11.5, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-jp)", color: nearLimit ? "var(--color-accent-700)" : muted(40) }}>
                {text.length} / {MAX_ANSWER_LENGTH}
              </div>
            )}
          </div>

          {!sttSupported && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ flex: "none", marginTop: 2, color: muted(50) }}><LcAlert size={14} /></span>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: muted(55), fontFamily: "var(--font-jp)" }}>お使いのブラウザは音声入力に対応していません。テキストでご回答ください。</div>
            </div>
          )}
        </div>
      </footer>

      {showAbort && <AbortModal onCancel={() => setShowAbort(false)} onConfirm={handleAbort} aborting={aborting} />}
    </div>
  );
}
