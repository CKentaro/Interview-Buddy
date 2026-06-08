"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { MOCK_SESSIONS } from "@/lib/mock-data";
import type { MockSessionSummary } from "@/lib/mock-data";
import { IconArrowRight, IconPlay } from "@/components/ui/icons";

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

function SessionRow({ s, last, latest }: { s: MockSessionSummary; last: boolean; latest: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/history/${s.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1.6fr 1fr 1fr 40px",
        gap: 16, alignItems: "center",
        padding: "18px 24px",
        borderBottom: last ? "none" : "1px solid var(--line)",
        background: hover ? "var(--bg-tint)" : "transparent",
        transition: "background .15s ease",
        textDecoration: "none", color: "inherit",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          {latest && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--teal)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--teal) 22%, transparent)" }} />}
          {s.rel}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 2 }}>{s.date}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-tint)", border: "1px solid var(--line)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-2)", fontFamily: "var(--font-noto-jp), sans-serif", flexShrink: 0 }}>{s.initial}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.company}</span>
      </div>
      <div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "var(--teal-soft)", color: "var(--teal-deep)", borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif" }}>{s.type}</span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.5 }}>
        {s.role}
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 3 }}>{s.duration}</div>
      </div>
      <div style={{ color: hover ? "var(--ink)" : "var(--ink-4)", justifySelf: "end", transform: hover ? "translateX(2px)" : "translateX(0)", transition: "transform .15s ease" }}>
        <IconArrowRight size={14} />
      </div>
    </Link>
  );
}

function PrimaryCard() {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/interview/setup"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left", background: "var(--ink)", color: "var(--bg)",
        borderRadius: 20, padding: "32px 36px",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: 200, textDecoration: "none",
        boxShadow: hover ? "0 18px 40px -14px rgba(11,23,51,0.32)" : "0 10px 30px -12px rgba(11,23,51,0.25)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "transform .15s ease, box-shadow .2s ease",
      }}
    >
      <div aria-hidden style={{ position: "absolute", right: -100, top: -100, width: 320, height: 320, borderRadius: 999, border: "1px solid rgba(246,244,237,0.07)" }} />
      <div aria-hidden style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: 999, border: "1px solid rgba(246,244,237,0.10)" }} />
      <div aria-hidden style={{ position: "absolute", right: 36, top: 36, width: 60, height: 60, borderRadius: 999, background: "color-mix(in oklch, var(--teal) 26%, transparent)", filter: "blur(1px)" }} />
      <div style={{ position: "relative" }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--teal)", marginBottom: 12 }}>— START A NEW SESSION</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.35, fontFamily: "var(--font-noto-jp), sans-serif" }}>面接練習を始める</div>
        <div style={{ fontSize: 13.5, color: "rgba(246,244,237,0.65)", marginTop: 8, maxWidth: 360, fontFamily: "var(--font-noto-jp), sans-serif" }}>
          企業情報・面接種別を入力 → AIとの模擬面接 → 4軸フィードバック
        </div>
      </div>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 18px", background: "var(--bg)", color: "var(--ink)", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", width: "fit-content" }}>
        <IconPlay size={11} /> コンテキストを入力して開始 <IconArrowRight size={13} />
      </div>
    </Link>
  );
}

function SecondaryCard() {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/history"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: "left", background: "var(--bg-card)", color: "var(--ink)",
        border: "1px solid", borderColor: hover ? "var(--ink)" : "var(--line)",
        borderRadius: 20, padding: "32px 28px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: 200, textDecoration: "none",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "border-color .15s ease, transform .15s ease",
      }}
    >
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.4, color: "var(--ink-3)", marginBottom: 12 }}>— REVIEW PAST</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.4, fontFamily: "var(--font-noto-jp), sans-serif" }}>面接練習履歴を<br />確認する</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: i < 7 ? "var(--teal)" : "var(--line-strong)", opacity: i < 7 ? 0.4 + (i / 10) * 0.6 : 0.5, display: "inline-block" }} />
          ))}
          <span style={{ marginLeft: 6, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            これまで {MOCK_SESSIONS.length} セッション
          </span>
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
        一覧を見る <IconArrowRight size={13} />
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const recent = MOCK_SESSIONS.slice(0, 5);

  return (
    <>
      <AppTopBar
        left={
          <div className="mono" style={{ fontSize: 11, letterSpacing: 0.6, color: "var(--ink-3)" }}>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>HOME</span>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>·</span>
            <span>{todayStr()}</span>
          </div>
        }
        right={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--teal)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--teal) 22%, transparent)" }} />
            AIモデル正常稼働中
          </span>
        }
      />

      <div style={{ padding: "48px 48px 80px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 12 }}>— WELCOME BACK</div>
          <h1 style={{ fontSize: 38, lineHeight: 1.3, letterSpacing: -0.6, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>
            {computeGreeting()}、<span style={{ color: "var(--ink)" }}>{user?.name ?? "…"}</span> さん。
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--ink-3)", margin: "12px 0 0", maxWidth: 560, fontFamily: "var(--font-noto-jp), sans-serif" }}>
            今日はどんな面接の準備をしますか？<br />企業や面接種別を選んで、ゆっくりと始めましょう。
          </p>
        </div>

        {/* CTA cluster */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 48 }}>
          <PrimaryCard />
          <SecondaryCard />
        </div>

        {/* Recent sessions */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.2, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>直近の練習</h2>
              <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0", fontFamily: "var(--font-noto-jp), sans-serif" }}>最近5件のセッション。詳細はクリックで開けます。</p>
            </div>
            <Link href="/history" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-2)", fontFamily: "var(--font-noto-jp), sans-serif", borderBottom: "1px solid var(--line-strong)", paddingBottom: 1, textDecoration: "none" }}>
              すべての履歴を見る <IconArrowRight size={12} />
            </Link>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1.6fr 1fr 1fr 40px", gap: 16, padding: "12px 24px", background: "var(--bg-tint)", borderBottom: "1px solid var(--line)" }}>
              {["日付", "企業", "面接タイプ", "職種 / 時間", ""].map((h, i) => (
                <div key={i} className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)" }}>{h.toUpperCase()}</div>
              ))}
            </div>
            {recent.map((s, i) => (
              <SessionRow key={s.id} s={s} last={i === recent.length - 1} latest={i === 0} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
