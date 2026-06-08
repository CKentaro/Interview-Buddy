"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { IconHome, IconList, IconUser, IconLogout, IconChevron, IconSidebar } from "@/components/ui/icons";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SidebarProps = {
  user?: User | null;
};

const NAV_ITEMS = [
  { id: "home",    label: "HOME",     icon: <IconHome />, href: "/home" },
  { id: "history", label: "練習履歴", icon: <IconList />, href: "/history" },
] as const;

type NavId = (typeof NAV_ITEMS)[number]["id"];

const COLLAPSE_KEY = "ib-sidebar-collapsed";

function getActiveId(pathname: string): NavId | null {
  if (pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/history")) return "history";
  return null; // /profile, /interview/* : no sidebar item highlighted
}

function avatarChar(name?: string | null): string {
  if (!name) return "?";
  // For Japanese names, take the first character
  return name.charAt(0);
}

function Avatar({ user, size }: { user?: User | null; size: number }) {
  const base = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    objectFit: "cover" as const,
  };
  if (user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.name ?? "ユーザー"}
        referrerPolicy="no-referrer"
        style={{ ...base, border: "1px solid var(--line)" }}
      />
    );
  }
  return (
    <div
      style={{
        ...base,
        background: "var(--ink)",
        color: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.42,
        fontFamily: "var(--font-noto-jp), sans-serif",
      }}
    >
      {avatarChar(user?.name)}
    </div>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const activeId: NavId | null = getActiveId(pathname);

  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore collapsed state after mount (reading localStorage during render
  // would cause an SSR hydration mismatch, so we sync it here instead).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setMenuOpen(false);
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      style={{
        width: collapsed ? 72 : 240,
        flexShrink: 0,
        background: "var(--bg-side)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "28px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
        transition: "width .2s ease",
      }}
    >
      {/* logo + collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
          padding: collapsed ? "0 0 28px" : "0 16px 28px",
        }}
      >
        {!collapsed && (
          <div style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" }}>
            <Logo nameSize={16} />
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          title={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            background: "transparent",
            border: "1px solid transparent",
            cursor: "pointer",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--ink-3)"; }}
        >
          <IconSidebar collapsed={collapsed} size={17} />
        </button>
      </div>

      {/* menu label */}
      {!collapsed && (
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ink-4)", padding: "0 24px 10px" }}
        >
          MENU
        </div>
      )}

      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
        {NAV_ITEMS.map((it) => {
          const on = activeId !== null && it.id === activeId;
          return (
            <Link
              key={it.id}
              href={it.href}
              title={collapsed ? it.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                borderRadius: 10,
                background: on ? "var(--bg-card)" : "transparent",
                color: on ? "var(--ink)" : "var(--ink-3)",
                fontWeight: on ? 600 : 500,
                fontSize: 14,
                fontFamily: "var(--font-noto-jp), sans-serif",
                border: on ? "1px solid var(--line)" : "1px solid transparent",
                boxShadow: on ? "0 1px 2px rgba(11,23,51,0.04)" : "none",
                position: "relative",
                textDecoration: "none",
              }}
            >
              {on && !collapsed && (
                <span
                  style={{
                    position: "absolute",
                    left: -12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 18,
                    background: "var(--teal)",
                    borderRadius: 999,
                  }}
                />
              )}
              <span style={{ color: on ? "var(--ink)" : "var(--ink-3)", display: "inline-flex" }}>
                {it.icon}
              </span>
              {!collapsed && <span>{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* user card → opens account menu */}
      <div style={{ position: "relative", padding: collapsed ? "0 12px" : "0 16px" }}>
        <div style={{ height: 1, background: "var(--line)", margin: collapsed ? "0 0 12px" : "0 0 12px" }} />

        {menuOpen && (
          <>
            {/* click-away backdrop */}
            <div
              onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
            />
            {/* popover */}
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: 12,
                minWidth: 196,
                zIndex: 50,
                background: "var(--bg-card)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                boxShadow: "0 16px 40px -12px rgba(11,23,51,0.28)",
                padding: 6,
                animation: "fadeUp .15s ease",
              }}
            >
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  color: "var(--ink)",
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tint)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <IconUser />
                <span>プロフィール</span>
              </Link>
              <button
                onClick={() => { setMenuOpen(false); signOut({ redirectTo: "/" }); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  color: "var(--warn)",
                  fontSize: 13.5,
                  fontWeight: 500,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                  textAlign: "left",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--warn-bg)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <IconLogout />
                <span>ログアウト</span>
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={collapsed ? (user?.name ?? "アカウント") : undefined}
          style={{
            width: "100%",
            padding: collapsed ? 6 : 12,
            background: menuOpen ? "var(--bg-tint)" : "var(--bg-card)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            cursor: "pointer",
            textAlign: "left",
            transition: "background .15s ease",
          }}
        >
          <Avatar user={user} size={34} />
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontFamily: "var(--font-noto-jp), sans-serif",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.name ?? "ゲスト"}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {user?.email ?? ""}
                </div>
              </div>
              <span style={{ color: "var(--ink-4)", display: "inline-flex", flexShrink: 0 }}>
                <IconChevron open={menuOpen} size={14} />
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
