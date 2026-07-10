"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type {
  SessionListItemResponse,
  SessionListResponse,
} from "@/app/api/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return "おはようございます";
  if (h >= 10 && h < 17) return "こんにちは";
  if (h >= 17 && h < 22) return "こんばんは";
  return "お疲れさまです";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HomePage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionListItemResponse[] | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: SessionListResponse) => setSessions(d.sessions))
      .catch(() => setSessions([]));
  }, []);

  const recent = sessions?.slice(0, 5) ?? [];

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}、{session?.user?.name ?? "ゲスト"} さん
        </h1>
        <p className="mt-2 text-black/60">
          今日はどんな面接の準備をしますか？企業や職種を選んで練習を始めましょう。
        </p>
      </div>

      <Link
        href="/interview/setup"
        className="flex items-center justify-between rounded-2xl bg-black px-8 py-8 text-white transition hover:opacity-90"
      >
        <div>
          <div className="text-sm text-white/60">START A NEW SESSION</div>
          <div className="mt-2 text-2xl font-bold">面接練習を始める</div>
        </div>
        <span className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
          開始する →
        </span>
      </Link>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">直近の練習</h2>
          <Link href="/history" className="text-sm text-black/60 underline">
            すべての履歴を見る
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          {sessions === null ? (
            <div className="p-8 text-center text-sm text-black/40">
              読み込み中…
            </div>
          ) : recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-black/40">
              まだ練習履歴がありません。
              <Link href="/interview/setup" className="ml-1 underline">
                最初の面接練習を始める
              </Link>
            </div>
          ) : (
            recent.map((s, i) => (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className={`flex items-center justify-between px-6 py-4 transition hover:bg-black/5 ${
                  i !== recent.length - 1 ? "border-b border-black/10" : ""
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {s.companyName ?? "（企業名未入力）"}
                  </div>
                  <div className="mt-1 text-xs text-black/50">
                    {formatDate(s.startedAt)} ·{" "}
                    {s.interviewerType ?? "面接官タイプ未設定"} ·{" "}
                    {s.questionCount}問
                  </div>
                </div>
                <span className="text-sm text-black/40">
                  {s.hasFeedback ? "FB済" : s.endedAt ? "FB生成中" : "進行中"}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
