"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { SessionListItemResponse, SessionListResponse } from "@/app/api/types";
import { LcMessage, LcInbox } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

function computeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 10) return "おはようございます";
  if (h >= 10 && h < 17) return "こんにちは";
  if (h >= 17 && h < 22) return "こんばんは";
  return "お疲れさまです";
}

function todayStr(): string {
  const d = new Date();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

function stageLabel(stage: string | null): string {
  return { first: "一次面接", second: "二次面接", final: "最終面接" }[stage ?? ""] ?? "面接練習";
}

function durationLabel(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "進行中";
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  return `${mins}分`;
}

function roleLabel(s: SessionListItemResponse): string {
  return [s.jobMajor, s.jobMinor].filter(Boolean).join(" / ")
    || [s.industryMajor, s.industryMinor].filter(Boolean).join(" / ")
    || "—";
}

function SessionRow({ s }: { s: SessionListItemResponse }) {
  const router = useRouter();
  const dateStr = new Date(s.startedAt).toLocaleDateString("ja-JP");
  return (
    <div
      className="ib-row"
      onClick={() => router.push(`/history/${s.id}`)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 24px", borderBottom: "1px solid var(--color-divider)", cursor: "pointer",
      }}
    >
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{s.companyName ?? "（企業名未入力）"}</span>
          <span style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>{roleLabel(s)}</span>
        </div>
        <div style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>{dateStr} ・ {stageLabel(s.selectionStage)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
        <div style={{ textAlign: "right", fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>
          <div>{durationLabel(s.startedAt, s.endedAt)}</div>
          <div>質問 {s.questionCount}問</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", color: muted(40) }}><path d="M9 18l6-6-6-6" /></svg>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [sessions, setSessions] = useState<SessionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: SessionListResponse) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const recent = sessions.slice(0, 3);
  const firstName = (user?.name ?? "").split(" ")[0] || user?.name || "";

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 32px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* greeting — a normal element on the Home screen */}
        <div className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12.5, color: muted(55), fontFamily: "var(--font-jp)" }}>{todayStr()}</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-jp)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
            {computeGreeting()}{firstName && `、${firstName}さん`}
          </div>
        </div>

        {/* primary CTA */}
        <section
          className="ib-section card elev-md"
          style={{ padding: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jp)" }}>今日の練習を始めましょう</div>
            <div style={{ fontSize: 13, color: muted(65), fontFamily: "var(--font-jp)" }}>5分からでも、ひとつ質問に答えるだけでも大丈夫です。</div>
          </div>
          <Link href="/interview/setup" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: 15, gap: 10, whiteSpace: "nowrap" }}>
            <LcMessage size={18} />
            <span>新しい面接練習をはじめる</span>
          </Link>
        </section>

        {/* recent */}
        <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-jp)" }}>直近の練習</h3>
            <Link href="/history" style={{ fontSize: 13, color: "var(--color-accent-700)" }}>すべての練習履歴を見る →</Link>
          </div>

          <div className="card elev-sm" style={{ minHeight: 200, padding: 0 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "52px 0" }}>
                <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
                <div style={{ fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>直近の練習を読み込んでいます…</div>
              </div>
            ) : recent.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "52px 24px", textAlign: "center" }}>
                <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>まだ練習の記録がありません</div>
                <div style={{ fontSize: 12.5, color: muted(55), maxWidth: "34ch", fontFamily: "var(--font-jp)" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
                <Link href="/interview/setup" className="btn btn-primary" style={{ marginTop: 6 }}>はじめての練習をする</Link>
              </div>
            ) : (
              recent.map((s) => <SessionRow key={s.id} s={s} />)
            )}
          </div>
        </section>
    </main>
  );
}
