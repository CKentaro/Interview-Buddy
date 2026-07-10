"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  AnswerResponse,
  QuestionResponse,
  SessionDetailResponse,
} from "@/app/api/types";

/**
 * 面接実施中の画面。没入させたいためシェル無しの (immersive) グループに置く。
 * 認証は親の (protected)/layout.tsx で他の要ログイン画面とまとめて保護される。
 *
 * 簡易実装: voiceEnabled の時のみ質問を TTS(/api/tts) で読み上げる。
 * 音声入力(STT)は非対応で、回答は常にテキスト入力で進める。
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
async function prepareTTS(text: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
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
async function speak(text: string): Promise<void> {
  const buf = await prepareTTS(text);
  if (buf) await playBuffer(buf);
}

type StoredSession = {
  sessionId: string;
  question: QuestionResponse;
  questionNumber: number;
  voiceEnabled?: boolean;
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
  };
}

export default function InterviewLivePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  // 初期値は SSR と一致する server-safe な値にする（sessionStorage はマウント後に読む）。
  const [question, setQuestion] = useState<CurrentQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  // 開始質問だけ、音声のバッファが済むまで全画面ローディングで待つ（表示と読み上げを揃える）。
  const [preparingSpeech, setPreparingSpeech] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [error, setError] = useState("");

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
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          answerText,
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
        nextBuffer = await prepareTTS(next.speechText ?? next.text);
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
              question && void speak(question.speechText ?? question.text)
            }
            className="rounded-full border border-black/15 px-4 py-2 text-xs text-black/60 transition hover:border-black/40"
          >
            🔊 もう一度読み上げる
          </button>
        </div>
      )}

      <textarea
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        rows={6}
        placeholder="ここに回答を入力してください…"
        className="w-full resize-none rounded-xl border border-black/15 p-4 text-sm outline-none focus:border-black/40"
      />

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
