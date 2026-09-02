"use client";

import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { LcMic, LcArrowUp, LcAlert } from "@/components/ui/icons";
import type {
  AnswerResponse,
  NextQuestionResponse,
  QuestionResponse,
  ResumeSessionResponse,
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

/* 入力フォームの寸法（何行で打ち止めるか・main が下に空ける余白）は
   globals.css の .ib-live 側のカスタムプロパティが持っている。画面幅で変わるため、
   ここでは持たず、伸縮の上限は算出済みの max-height を読んで使う。 */

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

/** 再生中の音声（Gemini・ブラウザ読み上げの両方）を止める。onended は呼ばれない。 */
function stopCurrentAudio() {
  if (_currentSource) {
    // 停止でも onended は発火するため、先に外して読み上げ終了と取り違えないようにする。
    _currentSource.onended = null;
    try { _currentSource.stop(); } catch { /* already stopped */ }
    _currentSource = null;
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
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

/**
 * Play a pre-loaded AudioBuffer immediately.
 * onEnded は読み上げが終わった時に呼ぶ。再生できなかった場合もその場で呼ぶ（口パクが残らないように）。
 */
async function playAudioBuffer(buf: AudioBuffer, onEnded?: () => void): Promise<void> {
  stopCurrentAudio();
  try {
    const ctx = getAudioContext();
    // Always resume — may be suspended after page navigation or inactivity
    if (ctx.state !== "running") await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => {
      if (_currentSource === src) _currentSource = null;
      onEnded?.();
    };
    src.start();
    _currentSource = src;
  } catch (e) {
    console.warn("[TTS] Play error:", e);
    onEnded?.();
  }
}

/**
 * Fallback: browser Web Speech API.
 * Gemini の合成に失敗したときだけ使う。音声枠の消費判定はセッション作成時に済んでおり、
 * こちらはブラウザ内で完結するため枠の抜け道にはならない（面接官ごとの声色は再現できない）。
 */
function speakWebSpeech(text: string, onEnded?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnded?.(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "ja-JP";
  utt.rate = 0.92;
  utt.onend = () => onEnded?.();
  utt.onerror = () => onEnded?.();
  window.speechSynthesis.speak(utt);
}

/**
 * 用意した音声（無ければブラウザ読み上げ）で質問を読み上げ、その間 setSpeaking(true) にする。
 * 読み上げ中かどうかは面接官アバターの口パクに使うため、失敗時も必ず false へ戻す。
 */
async function speakQuestion(
  buf: AudioBuffer | null,
  fallbackText: string,
  setSpeaking: (v: boolean) => void,
): Promise<void> {
  setSpeaking(true);
  if (buf) await playAudioBuffer(buf, () => setSpeaking(false));
  else speakWebSpeech(fallbackText, () => setSpeaking(false));
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
   状態は「ユーザー回答中（idle）」「次の質問を考え中（thinking）」「読み上げ中（speaking）」の 3 つ。
   speaking では閉じ口の上に開き口を重ねて交互に見せ、喋っているように表示する。 */
function AIPresence({ state }: { state: "idle" | "thinking" | "speaking" }) {
  return (
    <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {state === "thinking" && (
        <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-accent-200)", animation: "ib-breathe-ring 2s ease-out infinite" }} />
      )}
      <span aria-hidden style={{ position: "relative", width: 72, height: 72 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ib-face" src="/interviewer/face-closed.png" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`ib-face ib-face-open${state === "speaking" ? " ib-face-talking" : ""}`} src="/interviewer/face-open.png" alt="" />
      </span>
    </div>
  );
}

/* ── Abort dialog ── */
function AbortModal({ onCancel, onConfirm, aborting }: { onCancel: () => void; onConfirm: () => void; aborting: boolean }) {
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">面接を中断しますか？</div>
        <div className="dialog-body">送信済みの回答は保存され、HOME画面から後で再開できます。入力中でまだ送信していない文章は保存されません。</div>
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

  // 質問の読み上げ中は true。面接官アバターの口パクに使う。
  const [speaking, setSpeaking] = useState(false);

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
  // sessionStorage が無い（別端末・直接遷移等）場合は、DB の回答状況を正として再開する。
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
        await speakQuestion(buf, speechText, setSpeaking);
      });
      return () => {
        cancelled = true;
        stopCurrentAudio();
        setSpeaking(false);
      };
    }

    // sessionStorage 無し（別端末・直接遷移等）→ DB 上の状態から再開位置を復元する。
    fetch(`/api/sessions/${sessionId}/resume`, { method: "POST" })
      .then(async (response) => {
        if (response.status === 409) {
          router.replace(`/interview/${sessionId}/feedback`);
          return null;
        }
        if (!response.ok) throw new Error(`${response.status}`);
        return (await response.json()) as ResumeSessionResponse;
      })
      .then(async (resumed) => {
        if (cancelled) return;
        if (resumed === null) return;
        const resumedType = resolveInterviewerType(resumed.interviewerType);
        const speechText =
          resumed.currentQuestion.speechText ?? resumed.currentQuestion.text;
        setQuestion(resumed.currentQuestion);
        setVoiceEnabled(resumed.voiceEnabled);
        setInterviewerType(resumedType);
        setQuestionNumber(resumed.questionNumber);
        sessionStorage.setItem(
          "ib-session",
          JSON.stringify({
            sessionId: resumed.sessionId,
            voiceEnabled: resumed.voiceEnabled,
            question: resumed.currentQuestion,
            questionNumber: resumed.questionNumber,
            interviewerType: resumed.interviewerType ?? undefined,
          }),
        );
        setStatus("ready");

        if (resumed.voiceEnabled) {
          const buffer = await prepareTTS(
            speechText,
            sessionId,
            resumedType,
          );
          if (!cancelled) {
            await speakQuestion(buffer, speechText, setSpeaking);
          }
        }
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

  // Resize textarea（上限を超えたら伸ばさず、フォーム内スクロールに任せる）。
  // 上限は CSS が算出した max-height をそのまま読む（画面幅で変わるため）。
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = parseFloat(getComputedStyle(ta).maxHeight);
    ta.style.height = (Number.isNaN(max) ? ta.scrollHeight : Math.min(ta.scrollHeight, max)) + "px";
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
        setSpeaking(false);
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

      if (voiceEnabled) await speakQuestion(buf, speechText, setSpeaking);
    } catch (e) {
      console.error(e);
      setError("回答を送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。");
      setSending(false);
    }
  };

  // 中断：送信済みの回答を DB に残したまま PAUSED にし、HOME へ戻る。
  const handleAbort = async () => {
    if (aborting) return;
    if (recording) stopRecognition();
    setAborting(true);
    stopCurrentAudio();
    setSpeaking(false);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: "POST",
      });
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

  const aiState = sending ? "thinking" : speaking ? "speaking" : "idle";
  const aiStateLabel = sending
    ? "次の質問を考えています…"
    : speaking
      ? "面接官が質問しています…"
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
    <div className="ib-live">
      {/* minimal top bar */}
      <header className="ib-live-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jp)" }}>
            質問 {questionNumber} / {TOTAL_QUESTION_COUNT} 問
          </span>
          <span aria-hidden className="ib-live-progress">
            <span style={{ display: "block", height: "100%", width: `${(questionNumber / TOTAL_QUESTION_COUNT) * 100}%`, background: "var(--color-accent-500)", borderRadius: 2, transition: "width .4s ease" }} />
          </span>
          <span style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>・ 読み上げ {voiceEnabled ? "ON" : "OFF"}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowAbort(true)} style={{ fontSize: 12, flex: "none" }}>面接を中断する</button>
      </header>

      <main className="ib-live-main">
        <div style={{ width: "min(640px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {voiceLimited && (
            <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
              <span style={{ flex: "none", marginTop: 2, color: muted(50) }}><LcAlert size={14} /></span>
              <div style={{ fontSize: 12.5, color: muted(65), lineHeight: 1.7, fontFamily: "var(--font-jp)" }}>
                本日の音声利用枠（1日{MAX_VOICE_SESSIONS_PER_DAY}回）は使用済みのため、テキストのみで進行します。
              </div>
            </div>
          )}

          <h2 key={question.id} className="ib-live-question" style={{ animation: "ib-fade-up .4s ease both" }}>{question.text}</h2>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <AIPresence state={aiState} />
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
      <footer className="ib-live-footer">
        <div style={{ width: "min(640px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
          <div className="ib-composer">
            <textarea
              ref={taRef}
              className="ib-composer-input"
              rows={1}
              value={text}
              maxLength={MAX_ANSWER_LENGTH}
              onChange={(e) => handleManualEdit(e.target.value)}
              placeholder={recording ? "聞き取っています…" : "回答を入力するか、マイクで話してください"}
              onKeyDown={handleKeyDown}
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
