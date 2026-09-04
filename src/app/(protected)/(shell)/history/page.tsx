"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/interview/SessionCard";
import { CompanyLinkBadge } from "@/components/company/CompanyLinkBadge";
import { LcInbox } from "@/components/ui/icons";
import type { SessionListItemResponse, SessionListResponse } from "@/app/api/types";

const PAGE_SIZE = 5;

/** 表示の切り替え。既定は今までどおりの新しい順。 */
type ViewMode = "all" | "byCompany";

type CompanyGroup = {
  key: string;
  label: string;
  /** 企業マスタと紐づいたまとまりか（＝企業名の表記ゆれに関係なくまとまる）。 */
  linked: boolean;
  sessions: SessionListItemResponse[];
};

/**
 * 企業ごとにまとめる。企業マスタと紐づいた練習は companyId で、紐づいていない
 * （自由入力の）練習は企業名でまとめる。表記ゆれは残るが、名前が違えば別の企業として
 * 扱うのが利用者の期待に近い。企業名も無い練習は最後に「企業名未入力」でまとめる。
 */
function groupByCompany(sessions: SessionListItemResponse[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();

  for (const session of sessions) {
    const label = session.companyName ?? "（企業名未入力）";
    const key = session.companyId ?? `name:${label}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { key, label, linked: session.companyId !== null, sessions: [session] });
    } else {
      group.sessions.push(session);
    }
  }

  // 練習回数の多い企業を上に。同数なら直近に練習した企業を上に（一覧は新しい順で届く）。
  return [...groups.values()].sort((a, b) => b.sessions.length - a.sessions.length);
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>("all");

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
  const groups = groupByCompany(sessions);

  return (
    <main className="ib-page" style={{ "--ib-page-gap": "20px" } as React.CSSProperties}>
        <PageHeader
          title="練習履歴"
          subtitle={!loading && sessions.length > 0 ? `${sessions.length}回の練習を積み重ねてきました` : "これまでの模擬面接の記録"}
        />

        {!loading && sessions.length > 0 && (
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { key: "all", label: "すべて" },
              { key: "byCompany", label: "企業ごと" },
            ] as const).map((option) => (
              <button
                key={option.key}
                className={`ib-page-btn${view === option.key ? " ib-page-btn-active" : ""}`}
                style={{ paddingInline: 14 }}
                aria-pressed={view === option.key}
                onClick={() => setView(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <section className="ib-section">
          {loading ? (
            <div className="ib-list-state">
              <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>練習履歴を読み込んでいます…</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="ib-list-state">
              <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
              <div style={{ fontSize: 14, fontWeight: 500 }}>まだ練習の記録がありません</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: "34ch" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
              <Link href="/interview/setup" className="btn btn-primary" style={{ marginTop: 6 }}>はじめての練習をする</Link>
            </div>
          ) : view === "all" ? (
            <div className="ib-card-list">
              {visible.map((s) => <SessionCard key={s.id} s={s} />)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {groups.map((group) => (
                <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, minWidth: 0 }}>{group.label}</h2>
                      {group.linked && <CompanyLinkBadge />}
                    </div>
                    <span className="num" style={{ flex: "none", fontSize: 12, color: "var(--ink-3)" }}>
                      {group.sessions.length}回
                    </span>
                  </div>
                  <div className="ib-card-list">
                    {group.sessions.map((s) => <SessionCard key={s.id} s={s} compact />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!loading && view === "all" && totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
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
