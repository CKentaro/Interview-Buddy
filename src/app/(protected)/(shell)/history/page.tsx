"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/interview/SessionCard";
import { LcInbox } from "@/components/ui/icons";
import type { SessionListItemResponse, SessionListResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;
const PAGE_SIZE = 5;

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

        <section className="ib-section">
          {loading ? (
            <div className="ib-list-state">
              <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>練習履歴を読み込んでいます…</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="ib-list-state">
              <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>まだ練習の記録がありません</div>
              <div style={{ fontSize: 12.5, color: muted(55), maxWidth: "34ch", fontFamily: "var(--font-jp)" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
              <Link href="/interview/setup" className="btn btn-primary" style={{ marginTop: 6 }}>はじめての練習をする</Link>
            </div>
          ) : (
            <div className="ib-card-list">
              {visible.map((s) => <SessionCard key={s.id} s={s} />)}
            </div>
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
