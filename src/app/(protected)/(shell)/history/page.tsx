"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  SessionListItemResponse,
  SessionListResponse,
} from "@/app/api/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItemResponse[] | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: SessionListResponse) => setSessions(d.sessions))
      .catch(() => setSessions([]));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">面接履歴</h1>
        <p className="mt-2 text-sm text-black/60">
          過去の練習セッションを振り返れます。
        </p>
      </div>

      {sessions === null ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-black/10 p-8 text-center text-sm text-black/50">
          まだ練習履歴がありません。
          <Link href="/interview/setup" className="ml-1 underline">
            最初の面接練習を始める
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/history/${s.id}`}
              className="rounded-xl border border-black/10 p-5 transition hover:border-black/30"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-black/40">
                  {formatDate(s.startedAt)}
                </div>
                {s.hasFeedback && (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
                    FB済
                  </span>
                )}
              </div>
              <div className="mt-2 font-semibold">
                {s.companyName ?? "（企業名未入力）"}
              </div>
              <div className="mt-1 text-sm text-black/50">
                {[s.industryMajor, s.industryMinor]
                  .filter(Boolean)
                  .join(" / ") ||
                  [s.jobMajor, s.jobMinor].filter(Boolean).join(" / ") ||
                  "—"}
              </div>
              <div className="mt-3 text-xs text-black/40">
                {s.interviewerType ?? "—"} · {s.questionCount}問
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
