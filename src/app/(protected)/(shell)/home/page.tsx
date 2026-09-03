"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type {
  ResumableSessionItemResponse,
  ResumableSessionListResponse,
  ResumeSessionResponse,
  SessionListItemResponse,
  SessionListResponse,
} from "@/app/api/types";
import { SessionCard } from "@/components/interview/SessionCard";
import { LcMessage, LcInbox } from "@/components/ui/icons";


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

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const [sessions, setSessions] = useState<SessionListItemResponse[]>([]);
  const [resumableSessions, setResumableSessions] = useState<
    ResumableSessionItemResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState("");
  // 削除の確認ダイアログ。対象 ID を持っている間だけ開く。
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<SessionListResponse>;
      }),
      fetch("/api/sessions/resumable").then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.json() as Promise<ResumableSessionListResponse>;
      }),
    ])
      .then(([history, resumable]) => {
        setSessions(history.sessions);
        setResumableSessions(resumable.sessions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleResume = async (sessionId: string) => {
    if (resumingId !== null) return;
    setResumingId(sessionId);
    setResumeError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/resume`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const resumed = (await response.json()) as ResumeSessionResponse;
      sessionStorage.setItem(
        "ib-session",
        JSON.stringify({
          sessionId: resumed.sessionId,
          voiceEnabled: resumed.voiceEnabled,
          question: resumed.currentQuestion,
          questionNumber: resumed.questionNumber,
          interviewerType: resumed.interviewerType ?? undefined,
          // 再開した質問は読み上げない（pendingSpeech を立てない）。
          // 再開のたびに TTS を呼べてしまうのを防ぐため、読み上げは次の質問から。
          pendingSpeech: false,
        }),
      );
      router.push(`/interview/${sessionId}/live`);
    } catch (error) {
      console.error("面接の再開に失敗しました", error);
      setResumeError(
        "面接を再開できませんでした。画面を更新して、もう一度お試しください。",
      );
      setResumingId(null);
    }
  };

  const deleteTarget =
    resumableSessions.find((item) => item.id === deleteTargetId) ?? null;

  const handleDelete = async () => {
    if (deleteTargetId === null || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/sessions/${deleteTargetId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`${response.status}`);
      setResumableSessions((current) =>
        current.filter((item) => item.id !== deleteTargetId),
      );
      setDeleteTargetId(null);
    } catch (error) {
      console.error("面接の削除に失敗しました", error);
      setDeleteError(
        "面接を削除できませんでした。時間をおいて、もう一度お試しください。",
      );
    } finally {
      setDeleting(false);
    }
  };

  const recent = sessions.slice(0, 3);
  const firstName = (user?.name ?? "").split(" ")[0] || user?.name || "";

  return (
    <main className="ib-page">
        {/* greeting — a normal element on the Home screen */}
        <div className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="num" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-3)" }}>{todayStr()}</div>
          <div className="ib-greeting">
            {computeGreeting()}{firstName && `、${firstName}さん`}
          </div>
        </div>

        {/* 主導線。左のアイコンと文言をひとかたまりにして、幅の広い画面でも
            「文言」と「ボタン」が離れ離れに見えないようにしている。
            ボタンの文言は見出しと重複していたため短くした。 */}
        <section className="ib-section card ib-split" style={{ padding: "22px 24px", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 240 }}>
            <div style={{ width: 44, height: 44, flex: "none", borderRadius: "var(--radius-md)", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)" }}>
              <LcMessage size={20} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>今日の練習をはじめましょう</div>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--ink-3)" }}>5分からでも、ひとつ質問に答えるだけでも大丈夫です。</div>
            </div>
          </div>
          <Link href="/interview/setup" className="btn btn-primary ib-btn-wide" style={{ padding: "13px 28px", fontSize: 14 }}>
            はじめる
          </Link>
        </section>

        {!loading && resumableSessions.length > 0 && (
          <section
            className="ib-section"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>中断中の面接</h3>
              <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--ink-3)" }}>
                送信済みの回答から続きを再開できます。
              </div>
            </div>

            {resumeError && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-line)",
                  color: "var(--color-danger)",
                  fontSize: 12.5,
                  lineHeight: 1.7,
                }}
              >
                {resumeError}
              </div>
            )}

            <div className="ib-card-list">
              {resumableSessions.map((item) => {
                const role =
                  [item.jobMajor, item.jobMinor].filter(Boolean).join(" / ") ||
                  [item.industryMajor, item.industryMinor]
                    .filter(Boolean)
                    .join(" / ") ||
                  "設定なし";
                const isResuming = resumingId === item.id;
                return (
                  <div key={item.id} className="ib-session-card">
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <div
                        style={{ fontSize: 14.5, fontWeight: 500 }}
                      >
                        {item.companyName ?? "（企業名未入力）"}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--ink-3)" }}
                      >
                        {new Date(item.startedAt).toLocaleDateString("ja-JP")} ・ {role}
                        ・ 回答済み {item.answeredQuestionCount}問
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flex: "none" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={resumingId !== null}
                        onClick={() => void handleResume(item.id)}
                      >
                        {isResuming ? "再開しています…" : "再開する"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={resumingId !== null}
                        style={{
                          color: "var(--color-danger)",
                          borderColor: "var(--color-danger-line)",
                        }}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTargetId(item.id);
                        }}
                      >
                        削除する
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* recent */}
        <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>直近の練習</h3>
            <Link href="/history" style={{ fontSize: 13, color: "var(--ink-3)" }}>すべての練習履歴を見る →</Link>
          </div>

          {loading ? (
            <div className="ib-list-state">
              <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>直近の練習を読み込んでいます…</div>
            </div>
          ) : recent.length === 0 ? (
            <div className="ib-list-state">
              <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
              <div style={{ fontSize: 14, fontWeight: 500 }}>まだ練習の記録がありません</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", maxWidth: "34ch" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
            </div>
          ) : (
            <div className="ib-card-list">
              {recent.map((s) => <SessionCard key={s.id} s={s} compact />)}
            </div>
          )}
        </section>

        {deleteTarget && (
          <div
            className="dialog-backdrop"
            onClick={() => !deleting && setDeleteTargetId(null)}
          >
            <div
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ib-delete-session-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-title" id="ib-delete-session-title">
                中断中の面接を削除しますか？
              </div>
              <div className="dialog-body">
                「{deleteTarget.companyName ?? "（企業名未入力）"}」の中断中の面接を削除します。
                送信済みの回答{deleteTarget.answeredQuestionCount}問も一緒に削除され、
                この面接は再開できなくなります。この操作は取り消せません。
              </div>
              {deleteError && (
                <p
                  role="alert"
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: "var(--color-danger)",
                  }}
                >
                  {deleteError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteTargetId(null)}
                  disabled={deleting}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? "削除しています…" : "削除する"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
