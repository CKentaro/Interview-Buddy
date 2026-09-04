"use client";

import { useEffect, useRef, useState } from "react";
import { CompanyLinkBadge } from "@/components/company/CompanyLinkBadge";
import type { SessionDetailResponse, QuestionWithAnswer } from "@/app/api/types";
import { LcRepeat, LcScale, LcEye, LcCompass, LcChevronDown, LcAlert } from "@/components/ui/icons";
import { FEEDBACK_TIMEOUT_MS } from "@/domain/feedback/services/determineFeedbackStatus";
import { interviewerTypeLabel } from "@/domain/interview/model/InterviewerType.vo";

const POLL_INTERVAL_MS = 3000;

const AXIS_ORDER = ["SELF_AWARENESS", "VALUES_JUDGMENT", "REPRODUCIBILITY", "WORLDVIEW"];
/**
 * 軸ごとの色は、この製品で唯一の彩度。クロームは無彩色で通し、ここだけが色を持つ。
 * 白地でのコントラストは 4.2〜4.6:1 で、アイコン（3:1 以上）の基準は満たすが
 * 文字色には使わないこと。
 */
const AXIS_META: Record<
  string,
  { caption: string; icon: React.ReactNode; color: string; tint: string }
> = {
  REPRODUCIBILITY: {
    caption: "他の場面でも同じように話せそうかを見ています",
    icon: <LcRepeat />,
    color: "var(--axis-reproducibility)",
    tint: "var(--axis-reproducibility-tint)",
  },
  VALUES_JUDGMENT: {
    caption: "何を基準に意思決定しているかを見ています",
    icon: <LcScale />,
    color: "var(--axis-values)",
    tint: "var(--axis-values-tint)",
  },
  SELF_AWARENESS: {
    caption: "自分をどれだけ客観的に捉えられているかを見ています",
    icon: <LcEye />,
    color: "var(--axis-self)",
    tint: "var(--axis-self-tint)",
  },
  WORLDVIEW: {
    caption: "物事への関心の広さや深さを見ています",
    icon: <LcCompass />,
    color: "var(--axis-worldview)",
    tint: "var(--axis-worldview-tint)",
  },
};

/**
 * 深掘り質問の displayOrder は「既存の最大 + 1」で採番されるため、displayOrder 順では
 * すべての深掘りが主質問の後ろに並ぶ。実際に聞かれた順（主質問 → その深掘り）へ組み直す。
 */
function toConversationOrder(questions: QuestionWithAnswer[]): QuestionWithAnswer[] {
  const byDisplayOrder = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);
  const followUpsByParent = new Map<string, QuestionWithAnswer[]>();
  for (const q of byDisplayOrder) {
    if (q.parentQuestionId === null) continue;
    const group = followUpsByParent.get(q.parentQuestionId);
    if (group) group.push(q);
    else followUpsByParent.set(q.parentQuestionId, [q]);
  }
  const ordered = byDisplayOrder.flatMap((q) =>
    q.parentQuestionId === null ? [q, ...(followUpsByParent.get(q.id) ?? [])] : [],
  );
  // 親を辿れなかった深掘りも落とさない。
  const placed = new Set(ordered.map((q) => q.id));
  return [...ordered, ...byDisplayOrder.filter((q) => !placed.has(q.id))];
}

function stageLabel(stage: string | null): string {
  return { first: "一次面接", second: "二次面接", final: "最終面接" }[stage ?? ""] ?? "面接練習";
}

function LoadingOrb({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="ib-section" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "64px 0", textAlign: "center" }}>
      <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-neutral-300)", animation: "ib-breathe-ring 2.2s ease-out infinite" }} />
        <span style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--color-neutral-400)", animation: "ib-breathe 2.2s ease-in-out infinite" }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)", maxWidth: "34ch" }}>{sub}</p>
    </div>
  );
}

function AxisCard({ axis, label, comment }: { axis: string; label: string; comment: string }) {
  const meta = AXIS_META[axis] ?? {
    caption: "",
    icon: null,
    color: "var(--ink-3)",
    tint: "var(--color-surface)",
  };
  return (
    <div className="card" style={{ padding: "20px 22px", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 30, height: 30, flex: "none", borderRadius: "50%", background: meta.tint, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color }}>{meta.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.45 }}>{label}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{meta.caption}</div>
        </div>
      </div>
      <p className="ib-axis-comment" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.95, color: "var(--ink-2)" }}>{comment}</p>
    </div>
  );
}

function QARow({ q, open, onToggle, last }: { q: QuestionWithAnswer; open: boolean; onToggle: () => void; last: boolean }) {
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid var(--color-divider)" }}>
      <button className="ib-row" onClick={onToggle} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", boxSizing: "border-box", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.7, overflow: "hidden", textOverflow: open ? "clip" : "ellipsis", whiteSpace: open ? "normal" : "nowrap" }}>{q.content}</span>
        </div>
        <LcChevronDown size={16} open={open} />
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{q.answer?.content}</div>
        </div>
      )}
    </div>
  );
}

export function SessionDetailView({ sessionId }: { sessionId: string }) {
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [retry, setRetry] = useState(0);
  // サーバーの failed 判定は endedAt を起点にするため、履歴詳細（endedAt が古い）から
  // 再生成しても即 failed が返る。起動した生成の完了を待っている間はこちらを優先する。
  const [awaitingGeneration, setAwaitingGeneration] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let deadline: number | null = null;

    async function load(triggerGeneration: boolean) {
      if (triggerGeneration) {
        // Self-healing: (re)trigger generation. Idempotent server-side.
        const started = await fetch(`/api/sessions/${sessionId}/feedback/generate`, { method: "POST" }).catch(() => null);
        if (cancelled) return;
        // 202 = 生成を開始した。完了までの猶予を計り、その間は failed を表示しない。
        if (started?.status === 202) deadline = Date.now() + FEEDBACK_TIMEOUT_MS;
      }
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (cancelled) return;
      if (!res.ok) { setNotFound(true); return; }
      const data: SessionDetailResponse = await res.json();
      if (cancelled) return;
      const awaiting = deadline !== null && Date.now() < deadline && data.feedback.status !== "completed";
      setAwaitingGeneration(awaiting);
      setDetail(data);
      if (data.feedback.status === "generating" || awaiting) {
        timerRef.current = setTimeout(() => load(false), POLL_INTERVAL_MS);
      }
    }

    load(true);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId, retry]);

  if (notFound) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-3)" }}>
        セッションが見つかりませんでした。
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
      </div>
    );
  }

  const qa = toConversationOrder(detail.questions).filter((q) => q.answer !== null);
  const fb = detail.feedback;
  const dateLabel = new Date(detail.startedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  const allOpen = qa.length > 0 && qa.every((_, i) => openMap[i]);
  // 生成を起動して待っている間は、サーバーが failed と言っても「生成中」を見せ続ける。
  const showGenerating = fb.status === "generating" || (fb.status === "failed" && awaitingGeneration);

  const axes = fb.status === "completed"
    ? [...fb.axisFeedbacks].sort((a, b) => AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* overview */}
      <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22, minWidth: 0 }}>{detail.companyName ?? "面接"}　{stageLabel(detail.selectionStage)}</h2>
            {detail.companyId !== null && <CompanyLinkBadge size={14} />}
          </div>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{dateLabel}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="tag tag-neutral">{[detail.jobMajor, detail.jobMinor].filter(Boolean).join(" / ") || [detail.industryMajor, detail.industryMinor].filter(Boolean).join(" / ") || "—"}</span>
          <span className="tag tag-neutral">面接官：{detail.interviewerType ? interviewerTypeLabel(detail.interviewerType) : "—"}</span>
          <span className="tag tag-neutral">質問 {qa.length}問</span>
        </div>
      </section>

      {/* feedback */}
      {showGenerating && (
        <LoadingOrb label="気づきをことばにまとめています…" sub="今日のお話をふまえて、4つの視点からフィードバックを準備しています。もう少しお待ちください。" />
      )}

      {fb.status === "failed" && !awaitingGeneration && (
        <div className="ib-section card" style={{ padding: 24, gap: 12, alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-danger-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-danger)" }}><LcAlert size={20} /></div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>フィードバックを準備できませんでした</div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)", maxWidth: "38ch" }}>回答の内容は保存されています。時間をおいて、もう一度お試しください。</p>
          <button className="btn btn-primary" onClick={() => { setDetail(null); setRetry((r) => r + 1); }} style={{ marginTop: 4 }}>もう一度生成する</button>
        </div>
      )}

      {fb.status === "completed" && (
        <>
          <section className="ib-section card" style={{ padding: 24, gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>面接全体の総評</div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.9 }}>{fb.overallComment}</p>
          </section>

          <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>4つの視点からの気づき</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {axes.map((a) => <AxisCard key={a.axis} axis={a.axis} label={a.axisLabel} comment={a.comment} />)}
            </div>
          </section>
        </>
      )}

      {/* Q&A */}
      {qa.length > 0 && (
        <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>質問と回答の振り返り</h3>
            <button className="btn btn-ghost" onClick={() => setOpenMap(allOpen ? {} : Object.fromEntries(qa.map((_, i) => [i, true])))} style={{ fontSize: 12.5 }}>{allOpen ? "すべて閉じる" : "すべて開く"}</button>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {qa.map((q, i) => (
              <QARow key={q.id} q={q} open={!!openMap[i]} onToggle={() => setOpenMap((o) => ({ ...o, [i]: !o[i] }))} last={i === qa.length - 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
