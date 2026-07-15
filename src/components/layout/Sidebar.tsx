"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { LcHome, LcHistory, LcLogout, LcPanelLeft } from "@/components/ui/icons";

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
        fontWeight: 800,
        fontFamily: "var(--font-jp)",
      }}
    >
      {avatarChar(user?.name)}
    </div>
  );
}

export function Sidebar({ user }: { user?: User | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed state after mount (reading localStorage during render
  // would cause an SSR hydration mismatch, so we sync it here instead).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      style={{
        width: collapsed ? 72 : 232,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--shadow-sm)",
        background: "var(--color-bg)",
        padding: "16px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 1,
        transition: "width .2s ease",
      }}
    >
      {/* brand + collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
          padding: collapsed ? "0 0 16px" : "0 16px 16px",
          marginBottom: 12,
        }}
      >
        {!collapsed && <Logo size={18} />}
        <button
          onClick={toggle}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          title={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          style={{
            all: "unset",
            cursor: "pointer",
            flex: "none",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
            transition: "background .15s ease, color .15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--color-text) 6%, transparent)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "color-mix(in srgb, var(--color-text) 55%, transparent)"; }}
        >
          <LcPanelLeft size={18} />
        </button>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px", flex: 1 }}>
        {NAV_ITEMS.map((it) => {
          const on = pathname.startsWith(it.match);
          return (
            <Link
              key={it.id}
              href={it.href}
              className="ib-nav-link"
              aria-current={on ? "page" : undefined}
              title={collapsed ? it.label : undefined}
              style={collapsed ? { justifyContent: "center", gap: 0, padding: "10px 0" } : undefined}
            >
              {it.icon}
              {!collapsed && <span>{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 8px 0", borderTop: "1px solid var(--color-divider)", marginTop: 12 }}>
        <Link
          href="/profile"
          className="ib-nav-link"
          aria-current={pathname.startsWith("/profile") ? "page" : undefined}
          title={collapsed ? (user?.name ?? "プロフィール") : "プロフィールを開く"}
          style={collapsed ? { justifyContent: "center", gap: 0, padding: "10px 0", marginBottom: 4 } : { gap: 8, marginBottom: 4 }}
        >
          <Avatar user={user} />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jp)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.name ?? "ゲスト"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 400, color: "color-mix(in srgb, var(--color-text) 50%, transparent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.email ?? ""}
              </div>
            </div>
          )}
        </Link>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => signOut({ redirectTo: "/" })}
          title={collapsed ? "ログアウト" : undefined}
          style={{ fontSize: 13, gap: collapsed ? 0 : 8, color: "var(--color-text)", justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <LcLogout size={18} />
          {!collapsed && <span>ログアウト</span>}
        </button>
      </div>
    </aside>
  );
}
