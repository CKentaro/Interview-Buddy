"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionDetailResponse } from "@/app/api/types";

const POLL_INTERVAL_MS = 3000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function SessionDetailView({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (cancelled) return;
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data: SessionDetailResponse = await res.json();
      if (cancelled) return;
      setDetail(data);
      if (data.feedback.status === "generating") {
        timerRef.current = setTimeout(load, POLL_INTERVAL_MS);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId]);

  if (notFound) {
    return (
      <div className="rounded-xl border border-black/10 p-8 text-center text-sm text-black/50">
        セッションが見つかりませんでした。
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  const qa = detail.questions.filter((q) => q.answer !== null);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {formatDate(detail.startedAt)} の面接
        </h1>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-black/10 p-5 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-black/40">企業</div>
            <div className="mt-1 font-medium">
              {detail.companyName ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-black/40">業界</div>
            <div className="mt-1 font-medium">
              {[detail.industryMajor, detail.industryMinor]
                .filter(Boolean)
                .join(" / ") || "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-black/40">面接官タイプ</div>
            <div className="mt-1 font-medium">
              {detail.interviewerType ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-black/40">質問数</div>
            <div className="mt-1 font-medium">{qa.length}問</div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold">フィードバック</h2>
        {detail.feedback.status === "generating" && (
          <div className="flex items-center gap-4 rounded-xl border border-black/10 p-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black" />
            <span className="text-sm text-black/60">
              フィードバックを生成中です…
            </span>
          </div>
        )}
        {detail.feedback.status === "failed" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            フィードバックの生成に失敗しました。
          </div>
        )}
        {detail.feedback.status === "completed" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-black p-6 text-white">
              <div className="mb-2 text-xs text-white/50">総評</div>
              <p className="leading-relaxed">
                {detail.feedback.overallComment}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {detail.feedback.axisFeedbacks.map((a) => (
                <div
                  key={a.axis}
                  className="rounded-xl border border-black/10 p-5"
                >
                  <div className="text-sm font-bold">{a.axisLabel}</div>
                  <p className="mt-2 text-sm leading-relaxed text-black/70">
                    {a.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {qa.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">質問と回答</h2>
          <div className="flex flex-col gap-4">
            {qa.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-black/10 p-5">
                <div className="text-xs text-black/40">
                  Q{String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 font-medium">{q.content}</div>
                <div className="mt-3 rounded-lg bg-black/5 p-3 text-sm text-black/70 whitespace-pre-wrap">
                  {q.answer!.content}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
