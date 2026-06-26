"use client";

import { signOut } from "next-auth/react";

/**
 * ログアウトボタン（クライアント）。シェルのトップバー等に配置する想定。
 * クライアントから signOut() を呼び、完了後 /login へ戻す。
 */
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="rounded-md border border-black/15 px-3 py-1.5 text-sm transition hover:bg-black/5"
    >
      ログアウト
    </button>
  );
}
