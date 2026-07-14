"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionResponse, VoiceUsageResponse } from "@/app/api/types";

const STAGES = [
  { id: "first", label: "1次面接" },
  { id: "second", label: "2次面接" },
  { id: "final", label: "最終面接" },
];

const INTERVIEWERS = [
  { id: "friendly", label: "フレンドリー" },
  { id: "neutral", label: "ニュートラル" },
  { id: "strict", label: "厳しめ" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-black/70">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40";

export default function InterviewSetupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [industryMajor, setIndustryMajor] = useState("");
  const [industryMinor, setIndustryMinor] = useState("");
  const [jobMajor, setJobMajor] = useState("");
  const [jobMinor, setJobMinor] = useState("");
  const [selectionStage, setSelectionStage] = useState(STAGES[0]!.id);
  const [interviewerType, setInterviewerType] = useState(
    INTERVIEWERS[0]!.id,
  );
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceQuota, setVoiceQuota] = useState<VoiceUsageResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // 本日の音声ありセッション残回数を取得する（取得失敗時は表示を出さないだけ）。
  useEffect(() => {
    let cancelled = false;
    fetch("/api/voice-usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((quota: VoiceUsageResponse | null) => {
        if (cancelled || quota === null) return;
        setVoiceQuota(quota);
        if (quota.remaining <= 0) setVoiceEnabled(false);
      })
      .catch(() => {
        /* 残回数表示は補助情報のため、失敗しても面接開始は妨げない */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const voiceExhausted = voiceQuota !== null && voiceQuota.remaining <= 0;
  const valid = companyName.trim().length > 0;

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industryMajor: industryMajor || undefined,
          industryMinor: industryMinor || undefined,
          jobMajor: jobMajor || undefined,
          jobMinor: jobMinor || undefined,
          selectionStage,
          interviewerType,
          voiceEnabled,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const session: SessionResponse = await res.json();
      // サーバーが許可した音声可否を採用する（本日の音声枠が使用済みなら false に落ちる）。
      sessionStorage.setItem(
        "ib-session",
        JSON.stringify({
          sessionId: session.sessionId,
          question: session.firstQuestion,
          questionNumber: 1,
          voiceEnabled: session.voiceEnabled,
          // 音声を要求したのに枠超過で無効化された場合のみ、ライブ画面で通知する。
          voiceLimited: voiceEnabled && !session.voiceEnabled,
        }),
      );
      router.push(`/interview/${session.sessionId}/live`);
    } catch (e) {
      console.error(e);
      setError("セッションの開始に失敗しました。もう一度お試しください。");
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">面接設定</h1>
        <p className="mt-2 text-sm text-black/60">
          企業情報と面接の雰囲気を入力してください。AI
          がこの情報をもとに質問を組み立てます。
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-xl border border-black/10 p-6">
        <Field label="企業名 *">
          <input
            className={inputClass}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="例：株式会社サンプル"
          />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="業界（大分類）">
            <input
              className={inputClass}
              value={industryMajor}
              onChange={(e) => setIndustryMajor(e.target.value)}
              placeholder="例：IT・インターネット"
            />
          </Field>
          <Field label="業界（小分類）">
            <input
              className={inputClass}
              value={industryMinor}
              onChange={(e) => setIndustryMinor(e.target.value)}
              placeholder="例：Web・インターネットサービス"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="職種（大分類）">
            <input
              className={inputClass}
              value={jobMajor}
              onChange={(e) => setJobMajor(e.target.value)}
              placeholder="例：技術系"
            />
          </Field>
          <Field label="職種（小分類）">
            <input
              className={inputClass}
              value={jobMinor}
              onChange={(e) => setJobMinor(e.target.value)}
              placeholder="例：ソフトウェアエンジニア"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="選考状況">
            <select
              className={inputClass}
              value={selectionStage}
              onChange={(e) => setSelectionStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="面接官タイプ">
            <select
              className={inputClass}
              value={interviewerType}
              onChange={(e) => setInterviewerType(e.target.value)}
            >
              {INTERVIEWERS.map((iv) => (
                <option key={iv.id} value={iv.id}>
                  {iv.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-black/70">
              AI音声で読み上げる（TTS）
            </span>
            <span className="text-xs text-black/40">
              質問を音声でも読み上げます。音声入力（回答の録音）は非対応です。
            </span>
            {voiceQuota !== null && (
              <span
                className={`mt-1 text-xs ${
                  voiceExhausted ? "text-amber-600" : "text-black/40"
                }`}
              >
                {voiceExhausted
                  ? `本日の音声利用枠（1日${voiceQuota.limit}回）は使い切りました。`
                  : `本日の残り音声セッション: ${voiceQuota.remaining} / ${voiceQuota.limit} 回`}
              </span>
            )}
          </span>
          <input
            type="checkbox"
            checked={voiceEnabled}
            disabled={voiceExhausted}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="h-5 w-5 accent-black disabled:opacity-40"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!valid || starting}
          onClick={handleStart}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {starting ? "準備中…" : "面接練習を開始する →"}
        </button>
      </div>
    </div>
  );
}
