"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LcAlert } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

export function DeleteAccountSection({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      // 削除後はセッションが無効なので、サインアウトしてトップへ戻す。
      await signOut({ redirectTo: "/" });
    } catch {
      setError("削除に失敗しました。時間をおいて、もう一度お試しください。");
      setDeleting(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-jp)" }}>アカウントの削除</h3>
      <div
        className="card elev-sm"
        style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid var(--warn-line)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--warn)", display: "flex" }}><LcAlert size={20} /></span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>アカウントを削除する</div>
            <div style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>
              練習履歴とフィードバックもすべて削除されます。取り消せません。
            </div>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setConfirming(true)}
          style={{ color: "var(--warn)", borderColor: "var(--warn-line)", flex: "none" }}
        >
          削除する
        </button>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--warn)", fontFamily: "var(--font-jp)" }}>{error}</p>
      )}

      {confirming && (
        <div className="dialog-backdrop" onClick={() => !deleting && setConfirming(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-title">アカウントを削除しますか？</div>
            <div className="dialog-body">
              すべての練習履歴とフィードバックが完全に削除されます。この操作は取り消せません。
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={deleting}>
                キャンセル
              </button>
              <button className="btn btn-primary" onClick={handleDelete} disabled={deleting}>
                {deleting ? "削除しています…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
