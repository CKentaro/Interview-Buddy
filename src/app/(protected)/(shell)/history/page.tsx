"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { LcInbox } from "@/components/ui/icons";
import { interviewerTypeLabel } from "@/domain/interview/model/InterviewerType.vo";
import type { SessionListItemResponse, SessionListResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;
const PAGE_SIZE = 5;

function stageLabel(stage: string | null): string {
  return { first: "一次面接", second: "二次面接", final: "最終面接" }[stage ?? ""] ?? "面接練習";
}

function durationLabel(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "進行中";
  const mins = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  return `${mins}分`;
}

function relLabel(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

function roleLabel(s: SessionListItemResponse): string {
  return [s.jobMajor, s.jobMinor].filter(Boolean).join(" / ")
    || [s.industryMajor, s.industryMinor].filter(Boolean).join(" / ")
    || "—";
}

function SessionRow({ s }: { s: SessionListItemResponse }) {
  const dateStr = new Date(s.startedAt).toLocaleDateString("ja-JP");
  return (
    <Link href={`/history/${s.id}`} className="ib-row" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: "1px solid var(--color-divider)", cursor: "pointer" }}>
      <div style={{ minWidth: 0, flex: 1.4, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{s.companyName ?? "（企業名未入力）"}</span>
          <span style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>{roleLabel(s)}</span>
        </div>
        <div style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>
          {relLabel(s.startedAt)} ・ {dateStr} ・ {stageLabel(s.selectionStage)}{s.interviewerType ? ` ・ 面接官：${interviewerTypeLabel(s.interviewerType)}` : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none" }}>
        <div style={{ textAlign: "right", fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>
          <div>{durationLabel(s.startedAt, s.endedAt)}</div>
          <div>質問 {s.questionCount}問</div>
        </div>
        <span className={`tag ${s.hasFeedback ? "tag-accent" : "tag-neutral"}`} style={{ flex: "none" }}>{s.hasFeedback ? "フィードバックあり" : "生成中"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", color: muted(40) }}><path d="M9 18l6-6-6-6" /></svg>
      </div>
    </Link>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: SessionListResponse) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages - 1);
  const visible = sessions.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "44px 32px 56px", display: "flex", flexDirection: "column", gap: 20 }}>
        <PageHeader
          title="練習履歴"
          subtitle={!loading && sessions.length > 0 ? `${sessions.length}回の練習を積み重ねてきました` : "これまでの模擬面接の記録"}
        />

        <section className="ib-section card elev-sm" style={{ padding: 0, minHeight: 240 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 0" }}>
              <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>練習履歴を読み込んでいます…</div>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "64px 24px", textAlign: "center" }}>
              <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>まだ練習の記録がありません</div>
              <div style={{ fontSize: 12.5, color: muted(55), maxWidth: "34ch", fontFamily: "var(--font-jp)" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
              <Link href="/interview/setup" className="btn btn-primary" style={{ marginTop: 6 }}>はじめての練習をする</Link>
            </div>
          ) : (
            visible.map((s) => <SessionRow key={s.id} s={s} />)
          )}
        </section>

        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <button className="ib-page-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={cur === 0}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} className={`ib-page-btn${i === cur ? " ib-page-btn-active" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <button className="ib-page-btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={cur === totalPages - 1}>›</button>
          </div>
        )}
    </main>
  );
}
