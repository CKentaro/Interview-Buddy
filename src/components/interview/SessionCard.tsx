import Link from "next/link";
import { interviewerTypeLabel } from "@/domain/interview/model/InterviewerType.vo";
import type { SessionListItemResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

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

function metaLine(s: SessionListItemResponse, compact: boolean): string {
  const dateStr = new Date(s.startedAt).toLocaleDateString("ja-JP");
  if (compact) return `${dateStr} ・ ${stageLabel(s.selectionStage)}`;
  return [
    relLabel(s.startedAt),
    dateStr,
    stageLabel(s.selectionStage),
    s.interviewerType ? `面接官：${interviewerTypeLabel(s.interviewerType)}` : null,
  ].filter(Boolean).join(" ・ ");
}

/**
 * compact: ホーム画面の「直近の練習」向け。メタ情報を絞り、タグを出さない。
 */
export function SessionCard({ s, compact = false }: { s: SessionListItemResponse; compact?: boolean }) {
  return (
    <Link href={`/history/${s.id}`} className="ib-session-card">
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{s.companyName ?? "（企業名未入力）"}</span>
          <span style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>{roleLabel(s)}</span>
        </div>
        <div style={{ fontSize: 12, color: muted(50), fontFamily: "var(--font-jp)" }}>{metaLine(s, compact)}</div>
      </div>
      <div className="ib-session-meta">
        <div className="ib-session-stats" style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>
          <div>{durationLabel(s.startedAt, s.endedAt)}</div>
          <div>質問 {s.questionCount}問</div>
        </div>
        {!compact && (
          <span className={`tag ${s.hasFeedback ? "tag-accent" : "tag-neutral"}`} style={{ flex: "none" }}>
            {s.hasFeedback ? "フィードバックあり" : "生成中"}
          </span>
        )}
        <svg className="ib-session-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", color: muted(40) }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
