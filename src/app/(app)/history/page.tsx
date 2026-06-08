"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { IconArrowRight, IconArrowLeft, IconClock } from "@/components/ui/icons";
import type { SessionListItemResponse, SessionListResponse } from "@/types/api";

const PAGE_SIZE = 6;

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

function initialChar(name: string | null | undefined): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function SessionCard({ s, latest }: { s: SessionListItemResponse; latest: boolean }) {
  const [hover, setHover] = useState(false);
  const dur = durationLabel(s.startedAt, s.endedAt);
  const rel = relLabel(s.startedAt);
  const dateStr = new Date(s.startedAt).toLocaleDateString("ja-JP");
  const companyName = s.companyName ?? "（企業名未入力）";

  return (
    <Link
      href={`/history/${s.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "block", background: "var(--bg-card)", border: "1px solid", borderColor: hover ? "var(--ink)" : "var(--line)", borderRadius: 18, padding: "24px 26px", transform: hover ? "translateY(-2px)" : "translateY(0)", boxShadow: hover ? "0 12px 28px -16px rgba(11,23,51,0.20)" : "0 1px 2px rgba(11,23,51,0.03)", transition: "transform .2s ease, border-color .2s ease, box-shadow .2s ease", textDecoration: "none", color: "inherit" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        {latest && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 999, background: "var(--teal)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--teal) 22%, transparent)" }} />}
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif" }}>{rel}</div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 1 }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-tint)", border: "1px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--ink-2)", fontFamily: "var(--font-noto-jp), sans-serif", flexShrink: 0 }}>
          {initialChar(s.companyName)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>{companyName}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-noto-jp), sans-serif" }}>
            {[s.industryMajor, s.industryMinor].filter(Boolean).join(" / ") || [s.jobMajor, s.jobMinor].filter(Boolean).join(" / ") || "—"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><IconClock />{dur}</span>
          <span>{s.questionCount}問</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span>{s.interviewerType ?? "—"}</span>
          {s.hasFeedback && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--teal-soft)", borderRadius: 999, fontSize: 11, color: "var(--teal-deep)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
              FB済
            </span>
          )}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: hover ? "var(--ink)" : "var(--ink-3)", fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", transform: hover ? "translateX(2px)" : "translateX(0)", transition: "transform .15s ease, color .15s ease" }}>
          詳細を見る <IconArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 40 }}>
      <button disabled={current === 1} onClick={() => onChange(current - 1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: current === 1 ? "var(--ink-4)" : "var(--ink)", cursor: current === 1 ? "not-allowed" : "pointer", opacity: current === 1 ? 0.5 : 1, fontFamily: "var(--font-noto-jp), sans-serif" }}>
        <IconArrowLeft size={12} /> 前へ
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onChange(p)} style={{ width: 36, height: 36, borderRadius: 999, background: p === current ? "var(--ink)" : "var(--bg-card)", color: p === current ? "var(--bg)" : "var(--ink-3)", border: "1px solid", borderColor: p === current ? "var(--ink)" : "var(--line)", fontSize: 13, fontWeight: p === current ? 700 : 500, fontFamily: "var(--font-jetbrains), monospace", cursor: "pointer", transition: "all .15s ease" }}>
          {p}
        </button>
      ))}
      <button disabled={current === total} onClick={() => onChange(current + 1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 12.5, fontWeight: 600, color: current === total ? "var(--ink-4)" : "var(--ink)", cursor: current === total ? "not-allowed" : "pointer", opacity: current === total ? 0.5 : 1, fontFamily: "var(--font-noto-jp), sans-serif" }}>
        次へ <IconArrowRight size={12} />
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: SessionListResponse) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const visible = sessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <AppTopBar
        left={
          <div className="mono" style={{ fontSize: 11, letterSpacing: 0.6, color: "var(--ink-3)" }}>
            <Link href="/home" style={{ color: "var(--ink-3)" }}>HOME</Link>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>練習履歴</span>
          </div>
        }
        right={<Link href="/home" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", textDecoration: "none" }}><IconArrowLeft size={12} /> HOMEへ戻る</Link>}
      />

      <div style={{ padding: "44px 48px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 12 }}>— PRACTICE LIBRARY</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 36, lineHeight: 1.25, letterSpacing: -0.5, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>練習履歴</h1>
            {!loading && (
              <span style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
                全 <span className="mono" style={{ color: "var(--ink)", fontWeight: 600, fontSize: 16 }}>{sessions.length}</span> セッション · 最新から表示
              </span>
            )}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "10px 0 0", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            カードをクリックすると、その日のフィードバックを再表示できます。
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, border: "2px solid var(--line)", borderTopColor: "var(--ink)", animation: "spin .8s linear infinite" }} />
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>まだ練習履歴がありません</div>
            <Link href="/interview/setup" style={{ fontSize: 14, color: "var(--teal-deep)", textDecoration: "underline" }}>最初の面接練習を始める</Link>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {visible.map((s, i) => (
                <SessionCard key={s.id} s={s} latest={page === 1 && i === 0} />
              ))}
            </div>
            {totalPages > 1 && <Pagination current={page} total={totalPages} onChange={setPage} />}
          </>
        )}
      </div>
    </>
  );
}
