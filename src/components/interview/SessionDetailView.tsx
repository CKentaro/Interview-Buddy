"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import type { SessionDetailResponse, QuestionWithAnswer } from "@/app/api/types";
import { LcRepeat, LcScale, LcEye, LcCompass, LcChevronDown, LcAlert, LcHelpCircle, LcClose } from "@/components/ui/icons";
import {
  hasSeenFeedbackGuide,
  markFeedbackGuideAsSeen,
  subscribeFeedbackGuide,
} from "@/components/interview/feedbackGuideStorage";
import { FEEDBACK_TIMEOUT_MS } from "@/domain/feedback/services/determineFeedbackStatus";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";
import { interviewerTypeLabel } from "@/domain/interview/model/InterviewerType.vo";

const POLL_INTERVAL_MS = 3000;
const DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const AXIS_ORDER: readonly string[] = [
  EvaluationAxis.SELF_AWARENESS,
  EvaluationAxis.VALUES_JUDGMENT,
  EvaluationAxis.REPRODUCIBILITY,
  EvaluationAxis.WORLDVIEW,
];
/**
 * 軸ごとの色は、この製品で唯一の彩度。クロームは無彩色で通し、ここだけが色を持つ。
 * 白地でのコントラストは 4.2〜4.6:1 で、アイコン（3:1 以上）の基準は満たすが
 * 文字色には使わないこと。
 */
const AXIS_META: Record<
  EvaluationAxis,
  { caption: string; icon: React.ReactNode; color: string; tint: string }
> = {
  [EvaluationAxis.REPRODUCIBILITY]: {
    caption: "他の場面でも同じように話せそうかを見ています",
    icon: <LcRepeat />,
    color: "var(--axis-reproducibility)",
    tint: "var(--axis-reproducibility-tint)",
  },
  [EvaluationAxis.VALUES_JUDGMENT]: {
    caption: "何を基準に意思決定しているかを見ています",
    icon: <LcScale />,
    color: "var(--axis-values)",
    tint: "var(--axis-values-tint)",
  },
  [EvaluationAxis.SELF_AWARENESS]: {
    caption: "自分をどれだけ客観的に捉えられているかを見ています",
    icon: <LcEye />,
    color: "var(--axis-self)",
    tint: "var(--axis-self-tint)",
  },
  [EvaluationAxis.WORLDVIEW]: {
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

function FeedbackGuide({
  firstVisit,
  onDismiss,
}: {
  firstVisit: boolean;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        onDismiss();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(DIALOG_FOCUSABLE_SELECTOR),
      ).filter((element) => element.tabIndex >= 0);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  return (
    <div className="ib-feedback-guide-backdrop">
      <section
        ref={dialogRef}
        id="feedback-guide"
        className="ib-feedback-guide"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="feedback-guide-title"
        aria-describedby="feedback-guide-description"
      >
        <div className="ib-feedback-guide-topbar">
          <span>{firstVisit ? "はじめてのフィードバック" : "フィードバックガイド"}</span>
          <button
            type="button"
            className="ib-feedback-guide-close"
            aria-label="説明を閉じる"
            onClick={onDismiss}
          >
            <LcClose size={17} />
          </button>
        </div>

        <div className="ib-feedback-guide-heading">
          <div className="ib-feedback-guide-icon" aria-hidden="true">
            <LcHelpCircle size={20} />
          </div>
          <div>
            <h2 id="feedback-guide-title">フィードバックの見方</h2>
            <p id="feedback-guide-description">
              あなたの回答を、次の面接でより伝わる言葉へ整えるためのガイドです。
            </p>
          </div>
        </div>

        <p className="ib-feedback-guide-lead">
          Interview Buddyでは、面接中の実際の回答をもとに、AIが4つの視点からフィードバックを作成します。点数や合否ではなく、「伝わっていたこと」「伝わりにくかったこと」「次にどう変えるか」を言葉で整理します。
        </p>

        <div className="ib-feedback-guide-steps">
          <div className="ib-feedback-guide-step">
            <span>01</span>
            <div>
              <h3>回答を振り返る</h3>
              <p>一般論ではなく、面接中の質問とあなたの発言をもとに読み解きます。</p>
            </div>
          </div>
          <div className="ib-feedback-guide-step">
            <span>02</span>
            <div>
              <h3>4つの視点で整理する</h3>
              <p>自己認識・価値観と判断・再現性・世界観と知的好奇心の観点から確認します。</p>
            </div>
          </div>
          <div className="ib-feedback-guide-step">
            <span>03</span>
            <div>
              <h3>次の一歩に変える</h3>
              <p>回答全体の一貫性を捉え、次の面接で実践できる改善案をまとめます。</p>
            </div>
          </div>
        </div>

        <div className="ib-feedback-guide-features">
          <h3>このフィードバックの特徴</h3>
          <ul>
            <li>スコアではなく、具体的な文章でお伝えします</li>
            <li>改善が必要な点も、回答内容に沿って率直にお伝えします</li>
            <li>面接官タイプに合わせて、口調や厳しさが変わります</li>
          </ul>
        </div>

        <p className="ib-feedback-guide-note">
          AIによる提案であり、唯一の正解ではありません。自分に当てはまる部分を、回答を磨くためのヒントとして活用してください。
        </p>

        <div className="ib-feedback-guide-actions">
          <span>{firstVisit ? "次は、4つの視点を確認してみましょう" : "各評価軸の「？」から詳しい説明も確認できます"}</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDismiss}
            autoFocus
          >
            {firstVisit ? "4つの視点を見てみる" : "フィードバックに戻る"}
          </button>
        </div>
      </section>
    </div>
  );
}

function AxisCard({
  axis,
  label,
  comment,
  helpOpen,
  onToggleHelp,
}: {
  axis: string;
  label: string;
  comment: string;
  helpOpen: boolean;
  onToggleHelp: () => void;
}) {
  const evaluationAxis = axis as EvaluationAxis;
  const meta = AXIS_META[evaluationAxis] ?? {
    caption: "",
    icon: null,
    color: "var(--ink-3)",
    tint: "var(--color-surface)",
  };
  const description = EVALUATION_AXIS_METADATA[evaluationAxis]?.description;
  const helpId = `axis-help-${axis.toLowerCase()}`;

  return (
    <div className="card" style={{ padding: "20px 22px", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 30, height: 30, flex: "none", borderRadius: "50%", background: meta.tint, display: "flex", alignItems: "center", justifyContent: "center", color: meta.color }}>{meta.icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.45 }}>{label}</div>
            {description && (
              <button
                type="button"
                className="ib-axis-help-button"
                aria-label={`${label}の評価軸について`}
                aria-expanded={helpOpen}
                aria-controls={helpId}
                onClick={onToggleHelp}
              >
                <LcHelpCircle size={15} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{meta.caption}</div>
        </div>
      </div>
      {helpOpen && description && (
        <div id={helpId} className="ib-axis-help-text">
          <span>この軸で見ていること</span>
          <p>{description}。</p>
        </div>
      )}
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
  const { data: authSession } = useSession();
  const userId = authSession?.user?.id;
  const [detail, setDetail] = useState<SessionDetailResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [retry, setRetry] = useState(0);
  // サーバーの failed 判定は endedAt を起点にするため、履歴詳細（endedAt が古い）から
  // 再生成しても即 failed が返る。起動した生成の完了を待っている間はこちらを優先する。
  const [awaitingGeneration, setAwaitingGeneration] = useState(false);
  const [guideDisplay, setGuideDisplay] = useState<"default" | "open" | "closed">("default");
  const [axisHelpOpen, setAxisHelpOpen] = useState<Record<string, boolean>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const axesSectionRef = useRef<HTMLElement | null>(null);
  const guideTriggerRef = useRef<HTMLButtonElement | null>(null);
  const guideReturnFocusRef = useRef<HTMLElement | null>(null);
  const feedbackStatus = detail?.feedback.status;
  const feedbackGuideSeen = useSyncExternalStore(
    subscribeFeedbackGuide,
    () => !userId || hasSeenFeedbackGuide(userId),
    () => true,
  );
  const guideFirstVisit = feedbackStatus === "completed" && !!userId && !feedbackGuideSeen;
  const guideOpen = feedbackStatus === "completed" && (
    guideDisplay === "open" || (guideDisplay === "default" && guideFirstVisit)
  );

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

  function dismissFeedbackGuide(): void {
    const returnFocusTarget = guideReturnFocusRef.current;
    guideReturnFocusRef.current = null;

    if (guideFirstVisit && userId) {
      markFeedbackGuideAsSeen(userId);
      setAxisHelpOpen(
        Object.fromEntries(Object.values(EvaluationAxis).map((axis) => [axis, true])),
      );
    }
    setGuideDisplay("closed");

    window.requestAnimationFrame(() => {
      if (guideFirstVisit) {
        const axesSection = axesSectionRef.current;
        if (typeof axesSection?.scrollIntoView !== "function") return;
        const reduceMotion = typeof window.matchMedia === "function"
          && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        axesSection.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        axesSection.querySelector<HTMLElement>(".ib-axis-help-button")?.focus({
          preventScroll: true,
        });
        return;
      }

      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus();
      } else {
        guideTriggerRef.current?.focus();
      }
    });
  }

  function openFeedbackGuide(): void {
    guideReturnFocusRef.current = guideTriggerRef.current;
    setGuideDisplay("open");
  }

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
          <h2 style={{ margin: 0, fontSize: 22 }}>{detail.companyName ?? "面接"}　{stageLabel(detail.selectionStage)}</h2>
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
          {guideOpen && (
            <FeedbackGuide
              firstVisit={guideFirstVisit}
              onDismiss={dismissFeedbackGuide}
            />
          )}

          <div className="ib-section ib-feedback-summary">
            <div className="ib-feedback-about-row">
              <button
                ref={guideTriggerRef}
                type="button"
                className="btn btn-ghost ib-feedback-about-button"
                aria-expanded={guideOpen}
                aria-controls="feedback-guide"
                onClick={openFeedbackGuide}
              >
                <LcHelpCircle size={16} />
                フィードバックについて
              </button>
            </div>
            <section className="card" style={{ padding: 24, gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>面接全体の総評</div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.9 }}>{fb.overallComment}</p>
            </section>
          </div>

          <section ref={axesSectionRef} className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 24 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>4つの視点からの気づき</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {axes.map((a) => (
                <AxisCard
                  key={a.axis}
                  axis={a.axis}
                  label={a.axisLabel}
                  comment={a.comment}
                  helpOpen={axisHelpOpen[a.axis] ?? guideFirstVisit}
                  onToggleHelp={() => setAxisHelpOpen((open) => ({
                    ...open,
                    [a.axis]: !open[a.axis],
                  }))}
                />
              ))}
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
