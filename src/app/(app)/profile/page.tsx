"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { IconArrowLeft, IconCheck, GoogleIcon } from "@/components/ui/icons";
import type { UserMeResponse } from "@/types/api";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/* ── Activity grid: show last 4 weeks based on session dates ── */
function buildActivityGrid(lastSessionAt: string | null): number[][] {
  // Simple 4×7 grid: just mark today and last session if recent
  const grid = Array.from({ length: 4 }, () => Array(7).fill(0) as number[]);
  if (lastSessionAt) {
    const diff = Math.floor((Date.now() - new Date(lastSessionAt).getTime()) / 86400000);
    if (diff < 28) {
      const week = Math.floor(diff / 7);
      const day = new Date(lastSessionAt).getDay();
      grid[3 - week]![day] = 1;
    }
  }
  return grid;
}

function relLabel(isoDate: string | null): string {
  if (!isoDate) return "なし";
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  const [userMe, setUserMe] = useState<UserMeResponse | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((d: UserMeResponse) => setUserMe(d))
      .catch(console.error);
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" });
      if (res.ok) {
        await signOut({ redirectTo: "/" });
      }
    } catch {
      setDeleting(false);
    }
  };

  const lastSessionLabel = relLabel(userMe?.lastSessionAt ?? null);
  const lastSessionDate = userMe?.lastSessionAt
    ? new Date(userMe.lastSessionAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const activity = buildActivityGrid(userMe?.lastSessionAt ?? null);

  return (
    <>
      <AppTopBar
        left={
          <div className="mono" style={{ fontSize: 11, letterSpacing: 0.6, color: "var(--ink-3)" }}>
            <Link href="/home" style={{ color: "var(--ink-3)" }}>HOME</Link>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>プロフィール</span>
          </div>
        }
        right={
          <Link href="/home" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", textDecoration: "none" }}>
            <IconArrowLeft size={12} /> HOMEへ戻る
          </Link>
        }
      />

      <div style={{ padding: "44px 48px 80px", maxWidth: 1080, margin: "0 auto" }}>

        {/* hero */}
        <div style={{ marginBottom: 48, display: "flex", alignItems: "flex-start", gap: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 999, background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 28, flexShrink: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>
            {user?.name?.charAt(0) ?? "?"}
          </div>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 8 }}>— YOUR PROFILE</div>
            <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {user?.name ?? "ゲスト"}
            </h1>
            <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 6, fontFamily: "var(--font-noto-jp), sans-serif" }}>{user?.email}</div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", marginBottom: 40 }}>
          {[
            { label: "累計練習", value: userMe ? `${userMe.totalSessions}` : "…", unit: "回", sub: "これまでに完了したセッション" },
            { label: "最終練習日", value: lastSessionLabel, unit: "", sub: lastSessionDate },
            { label: "評価軸", value: "4", unit: "軸", sub: "質的フィードバックで振り返り" },
          ].map((stat, i, arr) => (
            <div key={i} style={{ padding: "28px 32px", borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 8 }}>{stat.label.toUpperCase()}</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.2 }}>
                {stat.value}
                {stat.unit && <span style={{ fontSize: 16, color: "var(--ink-3)", marginLeft: 4, fontFamily: "var(--font-noto-jp), sans-serif" }}>{stat.unit}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 6, fontFamily: "var(--font-noto-jp), sans-serif" }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* activity */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, padding: "28px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 6 }}>— ACTIVITY</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>練習アクティビティ</h2>
              </div>
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>直近4週間</span>
            </div>
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {DOW_LABELS.map((d) => (
                  <span key={d} className="mono" style={{ width: 16, fontSize: 9, color: "var(--ink-4)", textAlign: "center" }}>{d}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activity.map((week, wi) => (
                  <div key={wi} style={{ display: "flex", gap: 4 }}>
                    {week.map((active, di) => (
                      <span key={di} style={{ width: 16, height: 16, borderRadius: 4, background: active ? "var(--teal)" : "var(--line)", boxShadow: active ? "0 0 0 2px color-mix(in oklch, var(--teal) 22%, transparent)" : "none", display: "inline-block" }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* account */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--line)" }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 6 }}>— ACCOUNT</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>アカウント設定</h2>
            </div>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-tint)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GoogleIcon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif" }}>Googleアカウント</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-noto-jp), sans-serif" }}>{user?.email}</div>
                </div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--teal-soft)", borderRadius: 999, fontSize: 12, color: "var(--teal-deep)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
                <IconCheck size={11} /> 連携済み
              </div>
            </div>
            <div style={{ padding: "20px 32px" }}>
              <button onClick={() => signOut({ redirectTo: "/" })} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>
                ログアウト
              </button>
            </div>
          </div>
        </section>

        {/* danger zone */}
        <section>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--warn-line)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--warn-line)" }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--warn)", marginBottom: 6 }}>— DANGER ZONE</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif" }}>アカウント削除</h2>
            </div>
            <div style={{ padding: "24px 32px" }}>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink-3)", margin: "0 0 20px", maxWidth: 560, fontFamily: "var(--font-noto-jp), sans-serif" }}>
                アカウントを削除すると、すべての練習履歴とフィードバックが完全に削除されます。この操作は取り消せません。
              </p>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "transparent", color: "var(--warn)", border: "1px solid var(--warn-line)", borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>
                  アカウントを削除する
                </button>
              ) : (
                <div style={{ padding: "20px 24px", background: "var(--warn-bg)", border: "1px solid var(--warn-line)", borderRadius: 12, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>本当に削除しますか？この操作は取り消せません。</p>
                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "10px 18px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>
                      キャンセル
                    </button>
                    <button onClick={handleDeleteAccount} disabled={deleting} style={{ padding: "10px 18px", background: "var(--warn)", color: "white", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: deleting ? "wait" : "pointer" }}>
                      {deleting ? "削除中…" : "削除する"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
