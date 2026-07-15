"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  AnswerResponse,
  QuestionResponse,
  SessionDetailResponse,
} from "@/app/api/types";
import { MAX_ANSWER_LENGTH } from "@/domain/interview/model/answerConstraints";
import {
  DEFAULT_INTERVIEWER_TYPE,
  resolveInterviewerType,
  type InterviewerType,
} from "@/domain/interview/model/InterviewerType.vo";

/**
 * 面接実施中の画面。没入させたいためシェル無しの (immersive) グループに置く。
 * 認証は親の (protected)/layout.tsx で他の要ログイン画面とまとめて保護される。
 *
 * 簡易実装: voiceEnabled の時のみ質問を TTS(/api/tts) で読み上げる。
 * 音声入力(STT)は Web Speech API（ブラウザ内）で常時利用可能。voiceEnabled(TTS 出力)
 * とは直交し、非対応ブラウザ(Firefox 等)ではマイクを無効化してテキスト入力に誘導する。
 * STT はクライアント完結・無料のためサーバゲート/枠消費は無い。
 */

// Gemini TTS が返す PCM の仕様（サンプルレート）。
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
    try {
      _currentSource.stop();
    } catch {
      /* already stopped */
    }
    _currentSource = null;
  }
}

/**
 * テキストを /api/tts で音声化し、デコード済みの AudioBuffer を返す（まだ再生しない）。
 * 失敗時は null（呼び出し側はテキスト表示にフォールバックする）。
 * 質問画面を出す前にここで音声をバッファし、表示と読み上げを揃える。
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
    if (!res.ok) return null;

    const { audio } = (await res.json()) as { audio: string };
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);

    const ctx = getAudioContext();
    const buf = ctx.createBuffer(1, pcm.length, PCM_SAMPLE_RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i]! / 32768;
    return buf;
  } catch (e) {
    console.warn("[TTS] prepare failed:", e);
    return null;
  }
}

/** 準備済みの AudioBuffer を即座に再生する。 */
async function playBuffer(buf: AudioBuffer): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state !== "running") await ctx.resume();
    stopCurrentAudio();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    _currentSource = src;
  } catch (e) {
    console.warn("[TTS] playback failed:", e);
  }
}

/** テキストを音声化して再生する（手動の再生ボタン用）。失敗時は何もしない。 */
async function speak(
  text: string,
  sessionId: string,
  interviewerType: InterviewerType,
): Promise<void> {
  const buf = await prepareTTS(text, sessionId, interviewerType);
  if (buf) await playBuffer(buf);
}

/* ── 音声入力(STT): Web Speech API ──
 * ブラウザ内で完結する音声認識。標準の型定義が無いため最小限を自前で宣言する。 */
type SpeechResultAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechResultAlt; length: number };
type SpeechResultList = { length: number; [i: number]: SpeechResult };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechResultList;
};
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

/** ブラウザの SpeechRecognition コンストラクタを返す（非対応なら null）。 */
function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type StoredSession = {
  sessionId: string;
  question: QuestionResponse;
  questionNumber: number;
  voiceEnabled?: boolean;
  interviewerType?: string;
  voiceLimited?: boolean;
};

type CurrentQuestion = {
  id: string;
  text: string;
  speechText?: string;
};

/** sessionStorage から復元できる場合のみ同期的に読む（無ければ null）。 */
function readStoredQuestion(sessionId: string): {
  question: CurrentQuestion;
  questionNumber: number;
  voiceEnabled: boolean;
  interviewerType: InterviewerType;
  voiceLimited: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("ib-session");
  if (!raw) return null;
  const stored: StoredSession = JSON.parse(raw);
  if (stored.sessionId !== sessionId) return null;
  return {
    question: {
      id: stored.question.id,
      text: stored.question.text,
      speechText: stored.question.speechText,
    },
    questionNumber: stored.questionNumber,
    voiceEnabled: stored.voiceEnabled ?? false,
    interviewerType: resolveInterviewerType(stored.interviewerType),
    voiceLimited: stored.voiceLimited ?? false,
  };
}

export default function InterviewLivePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  // 初期値は SSR と一致する server-safe な値にする（sessionStorage はマウント後に読む）。
  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [interviewerType, setInterviewerType] = useState<InterviewerType>(
    DEFAULT_INTERVIEWER_TYPE,
  );
  const [voiceLimited, setVoiceLimited] = useState(false);
  const [loading, setLoading] = useState(true);
  // 開始質問だけ、音声のバッファが済むまで全画面ローディングで待つ（表示と読み上げを揃える）。
  const [preparingSpeech, setPreparingSpeech] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [error, setError] = useState("");

  // ── 音声入力(STT) ──
  const [recording, setRecording] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // 確定済みテキスト（既存入力 + isFinal な認識結果）。暫定結果はこの上に重ねて
  // ライブプレビューする。
  const committedTextRef = useRef("");
  // 意図としての録音状態。ブラウザが勝手に onend した際の自動再開判定に使う。
  const listeningRef = useRef(false);
  // 口述中にユーザーが手入力で編集した間、在庫フレーズの再挿入を防ぐために結果を無視する。
  const suppressResultRef = useRef(false);
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // マウント時に対応可否を判定し、アンマウント時に認識を止める。
  // window 依存の判定は SSR では出せず初期 state に置けないため、mount 後に一度だけ設定する。
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
    if (resyncTimerRef.current) {
      clearTimeout(resyncTimerRef.current);
      resyncTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setRecording(false);
  };

  // 口述中の手入力に追随する。ユーザーの編集値を確定テキストの土台にし、
  // エンジンの在庫フレーズを破棄してから認識を再開し、以降の発話を綺麗に続ける。
  const handleManualEdit = (value: string) => {
    setAnswerText(value.slice(0, MAX_ANSWER_LENGTH));
    if (!recording) return;
    committedTextRef.current = value.slice(0, MAX_ANSWER_LENGTH);
    suppressResultRef.current = true;
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      resyncTimerRef.current = null;
      suppressResultRef.current = false;
      // abort() は final を出さずに在庫フレーズを捨てる。onend が
      // listeningRef=true のまま新セッションを自動再開する。
      if (listeningRef.current) recognitionRef.current?.abort();
    }, 350);
  };

  const startRecognition = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSttSupported(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;

    // 既存入力の後ろから追記を始める。
    committedTextRef.current = answerText
      ? answerText.replace(/\s+$/, "") + " "
      : "";

    rec.onresult = (e) => {
      // 手入力の編集中は結果を無視（消した文字を暫定フレーズが再挿入するのを防ぐ）。
      if (suppressResultRef.current) return;
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        committedTextRef.current = (committedTextRef.current + final).slice(
          0,
          MAX_ANSWER_LENGTH,
        );
      }
      setAnswerText(
        (committedTextRef.current + interim).slice(0, MAX_ANSWER_LENGTH),
      );
    };
    rec.onerror = (ev) => {
      if (ev.error !== "no-speech" && ev.error !== "aborted") {
        listeningRef.current = false;
        setRecording(false);
      }
    };
    rec.onend = () => {
      // ブラウザが自発的に終了することがある。意図が続いていれば再開する。
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          listeningRef.current = false;
          setRecording(false);
        }
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

  const toggleRecording = () => {
    if (recording) stopRecognition();
    else startRecognition();
  };

  // マウント後に sessionStorage を読み、無ければセッション詳細から復元する。
  // ref ガードは使わない: StrictMode の mount→cleanup→mount で in-flight の
  // prepare がキャンセルされたまま再実行されず固まるのを避けるため、cleanup の
  // cancelled フラグだけで制御する（本番は 1 回、開発 StrictMode は自己回復）。
  useEffect(() => {
    let cancelled = false;

    const stored = readStoredQuestion(sessionId);
    if (stored) {
      // client 専用の sessionStorage をマウント時に一度だけ読んで復元する正当なケース。
      // （SSR では読めないため初期 state に置けず、effect での同期 setState になる）
      /* eslint-disable react-hooks/set-state-in-effect */
      setVoiceEnabled(stored.voiceEnabled);
      setInterviewerType(stored.interviewerType);
      setVoiceLimited(stored.voiceLimited);
      setQuestionNumber(stored.questionNumber);
      setQuestion(stored.question);
      setLoading(false);
      if (stored.voiceEnabled) {
        // 開始質問: 音声をバッファしてから読み上げつつ画面を出す。
        setPreparingSpeech(true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      if (stored.voiceEnabled) {
        void prepareTTS(
          stored.question.speechText ?? stored.question.text,
          sessionId,
          stored.interviewerType,
        ).then((buf) => {
          if (cancelled) return;
          setPreparingSpeech(false);
          if (buf) void playBuffer(buf);
        });
      }
      return () => {
        cancelled = true;
        stopCurrentAudio();
      };
    }

    // sessionStorage 無し(リロード等) → セッション詳細から未回答の質問を復元する（音声なし）。
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
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("セッション情報の取得に失敗しました。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const handleSubmit = async () => {
    if (!question || !answerText.trim()) return;
    if (recording) stopRecognition();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          answerText,
          voiceEnabled,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const result: AnswerResponse = await res.json();

      if (result.isSessionComplete) {
        sessionStorage.removeItem("ib-session");
        router.push(`/interview/${sessionId}/feedback`);
        return;
      }

      // 音声ありなら、直前の質問を出したまま次質問の音声をバッファし、
      // 準備できてから質問を差し替えて再生する（画面全体を待たせない）。
      const next = result.nextQuestion;
      let nextBuffer: AudioBuffer | null = null;
      if (voiceEnabled) {
        stopCurrentAudio();
        nextBuffer = await prepareTTS(
          next.speechText ?? next.text,
          sessionId,
          interviewerType,
        );
      }

      setQuestion({
        id: next.id,
        text: next.text,
        speechText: next.speechText,
      });
      setQuestionNumber((n) => n + 1);
      setAnswerText("");
      sessionStorage.setItem(
        "ib-session",
        JSON.stringify({
          sessionId,
          question: next,
          questionNumber: questionNumber + 1,
          voiceEnabled,
          interviewerType,
          voiceLimited,
        }),
      );
      if (nextBuffer) void playBuffer(nextBuffer);
    } catch (e) {
      console.error(e);
      setError("回答の送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  // 面接を中断する。再開は未実装のため、セッションごと破棄してホームへ戻る
  // （フィードバックは生成しない）。破棄は取り消せないので確認してから実行する。
  const handleAbort = async () => {
    if (aborting) return;
    if (
      !window.confirm(
        "面接を中断しますか？ここまでの質問・回答は破棄され、フィードバックは作成されません。",
      )
    ) {
      return;
    }
    if (recording) stopRecognition();
    setAborting(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(String(res.status));
      stopCurrentAudio();
      sessionStorage.removeItem("ib-session");
      router.replace("/home");
    } catch (e) {
      console.error(e);
      setError("面接の中断に失敗しました。もう一度お試しください。");
      setAborting(false);
    }
  };

  if (loading || preparingSpeech) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
        {preparingSpeech && (
          <p className="text-xs tracking-wider text-black/40">
            面接を準備中…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <button
        type="button"
        onClick={handleAbort}
        disabled={aborting}
        className="fixed right-5 top-5 rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/50 transition hover:border-black/40 hover:text-black/70 disabled:opacity-40"
      >
        {aborting ? "中断中…" : "面接を中断"}
      </button>

      {voiceLimited && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
          本日の音声利用枠（1日1回）は使用済みのため、テキストのみで進行します。
        </div>
      )}

      <div className="text-center text-xs tracking-wider text-black/40">
        QUESTION {String(questionNumber).padStart(2, "0")}
      </div>

      <div className="rounded-2xl bg-black px-10 py-10 text-white">
        <p className="text-lg leading-relaxed">{question?.text}</p>
      </div>

      {voiceEnabled && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() =>
              question &&
              void speak(
                question.speechText ?? question.text,
                sessionId,
                interviewerType,
              )
            }
            className="rounded-full border border-black/15 px-4 py-2 text-xs text-black/60 transition hover:border-black/40"
          >
            🔊 もう一度読み上げる
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <textarea
          value={answerText}
          onChange={(e) => handleManualEdit(e.target.value)}
          rows={6}
          maxLength={MAX_ANSWER_LENGTH}
          placeholder="ここに回答を入力、またはマイクで話してください…"
          className="w-full resize-none rounded-xl border border-black/15 p-4 text-sm outline-none focus:border-black/40"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={!sttSupported}
              className={`rounded-full border px-4 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                recording
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-black/15 text-black/60 hover:border-black/40"
              }`}
            >
              {recording ? "● 録音中 — 停止" : "🎤 マイクで入力"}
            </button>
            {!sttSupported && (
              <span className="text-xs text-black/40">
                このブラウザは音声入力に非対応です。テキストで入力してください。
              </span>
            )}
          </div>
          <div className="text-right text-xs tabular-nums text-black/40">
            {answerText.length} / {MAX_ANSWER_LENGTH}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!answerText.trim() || submitting}
          onClick={handleSubmit}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "送信中…" : "回答を送信する →"}
        </button>
      </div>
    </div>
  );
}
