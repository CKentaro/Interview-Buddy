"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { LcHome, LcHistory, LcLogout, LcPanelLeft, LcMenu, LcClose } from "@/components/ui/icons";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

const NAV_ITEMS = [
  { id: "home", label: "ホーム", icon: <LcHome />, href: "/home", match: "/home" },
  { id: "history", label: "練習履歴", icon: <LcHistory />, href: "/history", match: "/history" },
] as const;

const COLLAPSE_KEY = "ib-sidebar-collapsed";

function avatarChar(name?: string | null): string {
  if (!name) return "?";
  return name.charAt(0);
}

function Avatar({ user }: { user?: User | null }) {
  const base: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    flex: "none",
    objectFit: "cover",
  };
  if (user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.image} alt={user.name ?? "ユーザー"} referrerPolicy="no-referrer" style={base} />
    );
  }
  return (
    <div
      style={{
        ...base,
        background: "var(--color-neutral-300)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {avatarChar(user?.name)}
    </div>
  );
}

/**
 * ナビゲーション。デスクトップでは常設のサイドバー（折りたたみ可）、
 * モバイル（768px 以下）では上部バーと、そこから開く画面外ドロワーになる。
 * 見た目の出し分けはすべて globals.css のメディアクエリ側が持っているので、
 * ここでは畳んでいるか（data-collapsed）／開いているか（data-open）だけを伝える。
 * ラベルを条件レンダリングにしないのは、デスクトップで畳んだ状態のまま
 * モバイルのドロワーを開いてもラベルが消えないようにするため。
 */
export function Sidebar({ user }: { user?: User | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore collapsed state after mount (reading localStorage during render
  // would cause an SSR hydration mismatch, so we sync it here instead).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  // ドロワーを開けている間だけ：Esc で閉じ、背面をスクロールさせない。
  // デスクトップ幅に広がったときは（ドロワーが CSS 側で消えるため）開いた状態を畳んでおく。
  // そうしないと body のスクロールが止まったままになる。
  useEffect(() => {
    if (!drawerOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    const mq = window.matchMedia("(min-width: 769px)");
    const onDesktop = () => {
      if (mq.matches) setDrawerOpen(false);
    };

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onDesktop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onDesktop);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      {/* モバイルの上部バー（デスクトップでは CSS で消える） */}
      <header className="ib-topbar">
        <button
          className="ib-side-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={drawerOpen}
          aria-controls="ib-sidebar"
        >
          <LcMenu size={20} />
        </button>
        <Logo size={17} />
      </header>

      {drawerOpen && <div className="ib-drawer-backdrop" onClick={closeDrawer} />}

      <aside id="ib-sidebar" className="ib-sidebar" data-collapsed={collapsed} data-open={drawerOpen}>
        <div className="ib-side-head">
          <div className="ib-side-brand">
            <Logo size={18} />
          </div>
          <button
            className="ib-side-btn ib-side-collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
            title={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          >
            <LcPanelLeft size={18} />
          </button>
          <button className="ib-side-btn ib-side-close" onClick={closeDrawer} aria-label="メニューを閉じる">
            <LcClose size={20} />
          </button>
        </div>

        <nav className="ib-side-nav">
          {NAV_ITEMS.map((it) => {
            const on = pathname.startsWith(it.match);
            return (
              <Link
                key={it.id}
                href={it.href}
                className="ib-nav-link"
                aria-current={on ? "page" : undefined}
                title={collapsed ? it.label : undefined}
                onClick={closeDrawer}
              >
                {it.icon}
                <span className="ib-side-label">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ib-side-foot">
          <Link
            href="/profile"
            className="ib-nav-link ib-nav-link-profile"
            aria-current={pathname.startsWith("/profile") ? "page" : undefined}
            title={collapsed ? (user?.name ?? "プロフィール") : "プロフィールを開く"}
            onClick={closeDrawer}
          >
            <Avatar user={user} />
            <div className="ib-side-label" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name ?? "ゲスト"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email ?? ""}
              </div>
            </div>
          </Link>
          <button
            className="btn btn-ghost btn-block ib-side-logout"
            onClick={() => signOut({ redirectTo: "/" })}
            title={collapsed ? "ログアウト" : undefined}
          >
            <LcLogout size={18} />
            <span className="ib-side-label">ログアウト</span>
          </button>
        </div>
      </aside>
    </>
  );
}
