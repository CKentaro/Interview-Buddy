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

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

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

  const recent = sessions.slice(0, 3);
  const firstName = (user?.name ?? "").split(" ")[0] || user?.name || "";

  return (
    <main className="ib-page">
        {/* greeting — a normal element on the Home screen */}
        <div className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 12.5, color: muted(55), fontFamily: "var(--font-jp)" }}>{todayStr()}</div>
          <div className="ib-greeting">
            {computeGreeting()}{firstName && `、${firstName}さん`}
          </div>
        </div>

        {/* primary CTA */}
        <section className="ib-section card elev-md ib-split" style={{ padding: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jp)" }}>今日の練習を始めましょう</div>
            <div style={{ fontSize: 13, color: muted(65), fontFamily: "var(--font-jp)" }}>5分からでも、ひとつ質問に答えるだけでも大丈夫です。</div>
          </div>
          <Link href="/interview/setup" className="btn btn-primary ib-btn-wide" style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}>
            <LcMessage size={18} />
            <span>新しい面接練習をはじめる</span>
          </Link>
        </section>

        {!loading && resumableSessions.length > 0 && (
          <section
            className="ib-section"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div>
              <h3
                style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-jp)" }}
              >
                中断中の面接
              </h3>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  color: muted(55),
                  fontFamily: "var(--font-jp)",
                }}
              >
                送信済みの回答から続きを再開できます。
              </div>
            </div>

            {resumeError && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-accent-100)",
                  color: "var(--color-accent-800)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-jp)",
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
                        style={{
                          fontSize: 14.5,
                          fontWeight: 600,
                          fontFamily: "var(--font-jp)",
                        }}
                      >
                        {item.companyName ?? "（企業名未入力）"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: muted(50),
                          fontFamily: "var(--font-jp)",
                        }}
                      >
                        {new Date(item.startedAt).toLocaleDateString("ja-JP")} ・ {role}
                        ・ 回答済み {item.answeredQuestionCount}問
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={resumingId !== null}
                      onClick={() => void handleResume(item.id)}
                    >
                      {isResuming ? "再開しています…" : "再開する"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* recent */}
        <section className="ib-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-jp)" }}>直近の練習</h3>
            <Link href="/history" style={{ fontSize: 13, color: "var(--color-accent-700)" }}>すべての練習履歴を見る →</Link>
          </div>

          {loading ? (
            <div className="ib-list-state">
              <div style={{ width: 22, height: 22, border: "2px solid var(--color-divider)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin 1s linear infinite" }} />
              <div style={{ fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>直近の練習を読み込んでいます…</div>
            </div>
          ) : recent.length === 0 ? (
            <div className="ib-list-state">
              <span style={{ color: "var(--color-neutral-500)" }}><LcInbox size={32} /></span>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>まだ練習の記録がありません</div>
              <div style={{ fontSize: 12.5, color: muted(55), maxWidth: "34ch", fontFamily: "var(--font-jp)" }}>最初の面接練習をはじめると、ここに記録が並びます。</div>
              <Link href="/interview/setup" className="btn btn-primary" style={{ marginTop: 6 }}>はじめての練習をする</Link>
            </div>
          ) : (
            <div className="ib-card-list">
              {recent.map((s) => <SessionCard key={s.id} s={s} compact />)}
            </div>
          )}
        </section>
    </main>
  );
}
