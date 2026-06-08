"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { IconArrowRight, IconArrowLeft, IconCheck, IconChevron } from "@/components/ui/icons";
import type { SessionDetailResponse, FeedbackResponse } from "@/types/api";

const AXIS_META: Record<string, { name: string; sub: string }> = {
  REPRODUCIBILITY: { name: "再現性",           sub: "思考プロセスを構造化して語れたか" },
  VALUES_JUDGMENT: { name: "価値観・判断軸",    sub: "自分の価値観を具体に言語化できたか" },
  SELF_AWARENESS:  { name: "自己認識",          sub: "強み・弱みを適切な粒度で語れたか" },
  WORLDVIEW:       { name: "世界観・知的好奇心", sub: "自分の関心を面接の文脈で表現できたか" },
};

const AXIS_ORDER = ["SELF_AWARENESS", "VALUES_JUDGMENT", "REPRODUCIBILITY", "WORLDVIEW"] as const;

function AxisCard({ axis, comment, idx }: { axis: string; comment: string; idx: number }) {
  const meta = AXIS_META[axis] ?? { name: axis, sub: "" };
  const railColor = idx === 0 ? "var(--warm)" : idx === 1 ? "var(--teal)" : "var(--line-strong)";
  return (
    <article style={{ background: "var(--bg-card)", border: `1px solid ${idx === 0 ? "color-mix(in oklch, var(--warm) 35%, transparent)" : "var(--line)"}`, borderRadius: 18, padding: "28px 32px", position: "relative" }}>
      <div style={{ position: "absolute", left: 0, top: 24, bottom: 24, width: 3, borderRadius: 999, background: railColor }} />
      <div style={{ marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 6 }}>AXIS {String(idx + 1).padStart(2, "0")}</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>{meta.name}</h3>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--font-noto-jp), sans-serif" }}>{meta.sub}</div>
      </div>
      <p style={{ fontSize: 14.5, lineHeight: 1.9, color: "var(--ink-2)", margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>{comment}</p>
    </article>
  );
}

function QAItem({ question, answer, idx, open, onToggle, last }: { question: string; answer: string; idx: number; open: boolean; onToggle: () => void; last: boolean }) {
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <button onClick={onToggle} style={{ width: "100%", textAlign: "left", padding: "20px 24px", display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 16, alignItems: "center", background: open ? "var(--bg-tint)" : "transparent", border: "none", cursor: "pointer", transition: "background .15s ease" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.5 }}>Q{String(idx + 1).padStart(2, "0")}</span>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.55 }}>{question}</div>
        <span style={{ color: "var(--ink-3)" }}><IconChevron open={open} /></span>
      </button>
      {open && (
        <div style={{ padding: "0 24px 24px 84px", animation: "fadeUp .25s ease" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 8 }}>YOUR ANSWER · あなたの回答</div>
          <div style={{ padding: "14px 18px", background: "var(--bg-tint)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 13.5, lineHeight: 1.9, color: "var(--ink-2)", fontFamily: "var(--font-noto-jp), sans-serif", whiteSpace: "pre-wrap" }}>{answer}</div>
        </div>
      )}
    </div>
  );
}

export default function HistoryDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetailResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setOpenMap((o) => ({ ...o, [i]: !o[i] }));

  useEffect(() => {
    Promise.all([
      fetch(`/api/sessions/${sessionId}`).then((r) => r.json()),
      fetch(`/api/sessions/${sessionId}/feedback`).then((r) => r.json()),
    ]).then(([s, f]: [SessionDetailResponse, FeedbackResponse]) => {
      setSession(s);
      setFeedback(f);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: 999, border: "2px solid var(--line)", borderTopColor: "var(--ink)", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  if (!session) {
    return <div style={{ padding: "48px", color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>セッションが見つかりませんでした。</div>;
  }

  const dateLabel = new Date(session.startedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  const qa = session.questions.filter((q) => q.answer !== null);
  const axes = feedback?.status === "completed"
    ? AXIS_ORDER.map((key) => feedback.axisEvaluations.find((a) => a.axis === key)).filter(Boolean)
    : [];

  return (
    <>
      <AppTopBar
        left={
          <div className="mono" style={{ fontSize: 11, letterSpacing: 0.6, color: "var(--ink-3)" }}>
            <Link href="/home" style={{ color: "var(--ink-3)" }}>HOME</Link>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <Link href="/history" style={{ color: "var(--ink-3)" }}>練習履歴</Link>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{new Date(session.startedAt).toLocaleDateString("ja-JP")} · {session.companyName?.slice(0, 8) ?? "DETAIL"}</span>
          </div>
        }
      />

      <div style={{ padding: "44px 48px 80px", maxWidth: 1080, margin: "0 auto" }}>
        {/* hero */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 12 }}>— ARCHIVED FEEDBACK · 練習履歴の詳細</div>
              <h1 style={{ fontSize: 36, lineHeight: 1.3, letterSpacing: -0.5, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>
                {dateLabel} の練習
              </h1>
              <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "10px 0 0", fontFamily: "var(--font-noto-jp), sans-serif" }}>
                <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{session.companyName ?? "面接"}</strong> のセッション記録です。
              </p>
            </div>
            <Link href="/history" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", whiteSpace: "nowrap", flexShrink: 0, textDecoration: "none" }}>
              <IconArrowLeft size={12} /> 一覧へ戻る
            </Link>
          </div>

          <div style={{ display: "flex", marginTop: 24, background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
            {[
              { l: "実施日", v: dateLabel },
              { l: "企業", v: session.companyName ?? "—" },
              { l: "業界", v: [session.industryMajor, session.industryMinor].filter(Boolean).join(" / ") || "—" },
              { l: "面接官", v: session.interviewerType ?? "—" },
              { l: "質問数", v: `${qa.length}問` },
            ].map((m, i, arr) => (
              <div key={i} style={{ flex: 1, padding: "16px 20px", borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 6 }}>{m.l.toUpperCase()}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.5 }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* overall coach */}
        {feedback?.status === "completed" && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 8 }}>— OVERALL · COACH&apos;S VIEW</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>コーチの視点</h2>
            </div>
            <div style={{ background: "var(--ink)", color: "var(--bg)", borderRadius: 20, padding: "36px 44px", position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "start" }}>
              <div aria-hidden style={{ position: "absolute", right: -120, top: -120, width: 320, height: 320, borderRadius: 999, border: "1px solid rgba(246,244,237,0.06)" }} />
              <div aria-hidden style={{ position: "absolute", right: 40, top: 40, width: 80, height: 80, borderRadius: 999, background: "color-mix(in oklch, var(--teal) 22%, transparent)", filter: "blur(2px)" }} />
              <div style={{ width: 56, height: 56, borderRadius: 999, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid color-mix(in oklch, var(--teal) 35%, transparent)", position: "relative" }}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="12" cy="13" r="2.2" fill="var(--ink)" />
                  <circle cx="20" cy="13" r="2.2" fill="var(--teal-deep)" />
                  <path d="M11 20c1.4 1.4 3.1 2 5 2s3.6-.6 5-2" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <div style={{ position: "relative" }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--teal)", marginBottom: 10 }}>COACH BUDDY · 総評</div>
                <p style={{ fontSize: 17, lineHeight: 1.95, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>{feedback.overallComment}</p>
              </div>
            </div>
          </section>
        )}

        {feedback?.status === "generating" && (
          <div style={{ marginBottom: 48, padding: "24px 28px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, border: "2px solid var(--line)", borderTopColor: "var(--ink)", animation: "spin .8s linear infinite", flexShrink: 0 }} />
            <div style={{ fontSize: 14, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>フィードバックを生成中です…</div>
          </div>
        )}

        {/* axis feedback */}
        {axes.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 8 }}>— 4 AXES · QUALITATIVE FEEDBACK</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>評価軸ごとのフィードバック</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {axes.map((a, i) => a && <AxisCard key={a.axis} axis={a.axis} comment={a.comment} idx={i} />)}
            </div>
          </section>
        )}

        {/* Q&A */}
        {qa.length > 0 && (
          <section style={{ marginBottom: 60 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 8 }}>— Q & A · TRANSCRIPT REVIEW</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>質問と回答の振り返り</h2>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={() => setOpenMap(Object.fromEntries(qa.map((_, i) => [i, true])))} style={{ fontSize: 12, color: "var(--ink-3)", cursor: "pointer", background: "none", border: "none", fontFamily: "var(--font-noto-jp), sans-serif" }}>すべて開く</button>
                <span style={{ color: "var(--ink-4)" }}>·</span>
                <button onClick={() => setOpenMap({})} style={{ fontSize: 12, color: "var(--ink-3)", cursor: "pointer", background: "none", border: "none", fontFamily: "var(--font-noto-jp), sans-serif" }}>すべて閉じる</button>
              </div>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
              {qa.map((q, i) => <QAItem key={q.id} question={q.content} answer={q.answer!.content} idx={i} open={!!openMap[i]} onToggle={() => toggle(i)} last={i === qa.length - 1} />)}
            </div>
          </section>
        )}

        {/* CTA */}
        <section>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, padding: "32px 36px", display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 10 }}>— REVISIT OR PRACTICE AGAIN</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.2, fontFamily: "var(--font-noto-jp), sans-serif", marginBottom: 6 }}>この振り返りから、次の練習につなげてみますか？</div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>「次回意識すること」を念頭に、同じ設定で挑戦してみるのもおすすめです。</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Link href="/history" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 22px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", textDecoration: "none" }}>
                <IconArrowLeft size={12} /> 一覧へ戻る
              </Link>
              <Link href="/interview/setup" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 24px", background: "var(--ink)", color: "var(--bg)", borderRadius: 999, fontSize: 13.5, fontWeight: 700, fontFamily: "var(--font-noto-jp), sans-serif", boxShadow: "0 8px 24px -8px rgba(11,23,51,0.25)", textDecoration: "none" }}>
                同じ設定で練習する <IconArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
