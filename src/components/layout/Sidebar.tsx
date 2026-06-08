"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { IconHome, IconList, IconUser, IconLogout } from "@/components/ui/icons";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SidebarProps = {
  user?: User | null;
};

const NAV_ITEMS = [
  { id: "home",    label: "HOME",       icon: <IconHome />,   href: "/home" },
  { id: "history", label: "練習履歴",   icon: <IconList />,   href: "/history" },
  { id: "profile", label: "プロフィール", icon: <IconUser />,  href: "/profile" },
] as const;

type NavId = (typeof NAV_ITEMS)[number]["id"];

function getActiveId(pathname: string): NavId | null {
  if (pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/profile")) return "profile";
  return null; // /interview/* paths: no sidebar item highlighted
}

function avatarChar(name?: string | null): string {
  if (!name) return "?";
  // For Japanese names, take the first character
  return name.charAt(0);
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const activeId: NavId | null = getActiveId(pathname);

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--bg-side)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "28px 0",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      {/* logo */}
      <div style={{ padding: "0 24px 28px" }}>
        <Logo nameSize={17} />
      </div>

      {/* menu label */}
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--ink-4)", padding: "0 24px 10px" }}
      >
        MENU
      </div>

      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
        {NAV_ITEMS.map((it) => {
          const on = activeId !== null && it.id === activeId;
          return (
            <Link
              key={it.id}
              href={it.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
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
              {on && (
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
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* logout + user card */}
      <div style={{ padding: "0 12px" }}>
        <div style={{ height: 1, background: "var(--line)", margin: "0 12px 12px" }} />
        <button
          onClick={() => signOut({ redirectTo: "/" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            color: "var(--ink-3)",
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "var(--font-noto-jp), sans-serif",
            textAlign: "left",
            cursor: "pointer",
            background: "transparent",
            border: "none",
          }}
        >
          <IconLogout />
          <span>ログアウト</span>
        </button>
      </div>

      {/* user card */}
      <div
        style={{
          margin: "16px 16px 0",
          padding: "12px",
          background: "var(--bg-card)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          {avatarChar(user?.name)}
        </div>
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
      </div>
    </aside>
  );
}
