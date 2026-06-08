"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: scrolled ? "rgba(246,244,237,0.85)" : "transparent",
        backdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
        WebkitBackdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        transition: "all .25s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 72,
        }}
      >
        <Logo />
        <nav style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {[
            { href: "#features", label: "特徴" },
            { href: "#how", label: "使い方" },
            { href: "#faq", label: "よくある質問" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink-2)",
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 18px",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              color: "var(--ink)",
            }}
          >
            ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}
