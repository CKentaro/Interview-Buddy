"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { GoogleIcon } from "@/components/ui/icons";

export default function LoginPage() {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (state === "loading") return;
    setState("loading");
    setError("");
    try {
      await signIn("google", { redirectTo: "/home" });
    } catch {
      setState("idle");
      setError(
        "Googleアカウントの認証に失敗しました。時間をおいてもう一度お試しください。"
      );
    }
  };

  const ftLink: React.CSSProperties = {
    color: "var(--ink-2)",
    borderBottom: "1px solid var(--line-strong)",
    paddingBottom: 1,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        position: "relative",
        background: "var(--bg)",
      }}
    >
      {/* back link */}
      <Link
        href="/"
        style={{
          position: "absolute",
          top: 32,
          left: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--ink-3)",
          fontFamily: "var(--font-noto-jp), sans-serif",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M13 8H3M7 4 3 8l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        TOPページへ戻る
      </Link>

      {/* logo */}
      <div style={{ marginBottom: 48 }}>
        <Logo />
      </div>

      {/* form card */}
      <div style={{ width: "100%", maxWidth: 440 }}>
        <h1
          style={{
            fontSize: 34,
            lineHeight: 1.35,
            letterSpacing: -0.5,
            fontWeight: 700,
            margin: "0 0 14px",
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          おかえりなさい。
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: "var(--ink-3)",
            margin: "0 0 36px",
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          Googleアカウントでログインして、
          <br />
          続きから練習を再開しましょう。
        </p>

        {/* error alert */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "14px 16px",
              background: "var(--warn-bg)",
              border: "1px solid var(--warn-line)",
              borderRadius: 12,
              marginBottom: 20,
              animation: "shake .4s ease, fadeUp .3s ease",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                marginTop: 1,
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "var(--warn)",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              !
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--warn)",
                  marginBottom: 2,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                ログインに失敗しました
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {error}
              </div>
            </div>
            <button
              onClick={() => { setState("idle"); setError(""); }}
              aria-label="閉じる"
              style={{ color: "var(--ink-3)", padding: 2, cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 3l10 10M13 3 3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Google login button */}
        <button
          onClick={handleLogin}
          disabled={state === "loading"}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "16px 22px",
            background: state === "success" ? "var(--ink)" : "var(--bg-card)",
            color: state === "success" ? "var(--bg)" : "var(--ink)",
            border: "1px solid",
            borderColor: state === "success" ? "var(--ink)" : "var(--line-strong)",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "var(--font-noto-jp), sans-serif",
            opacity: state === "loading" ? 0.85 : 1,
            cursor: state === "loading" ? "wait" : "pointer",
            transition: "background .25s ease, border-color .2s ease, color .25s ease",
          }}
        >
          {state === "loading" ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: "2px solid var(--line)",
                  borderTopColor: "var(--ink)",
                  animation: "spin .8s linear infinite",
                }}
              />
              <span>認証中…</span>
            </>
          ) : state === "success" ? (
            <>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8.5 6.5 12 13 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>ログイン成功</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>Googleアカウントでログイン</span>
            </>
          )}
        </button>

        {/* fine print */}
        <p
          style={{
            fontSize: 12,
            lineHeight: 1.85,
            color: "var(--ink-3)",
            margin: "20px 0 0",
            textAlign: "center",
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          続行することで、
          <a href="#" style={ftLink}>
            利用規約
          </a>{" "}
          と{" "}
          <a href="#" style={ftLink}>
            プライバシーポリシー
          </a>{" "}
          に同意したものとみなされます。
        </p>

        {/* divider */}
        <div style={{ margin: "36px 0 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: 0.8 }}>
            NEED HELP?
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        {/* help box */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "var(--bg-tint)",
            padding: "16px 18px",
            borderRadius: 12,
            border: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--ink-2)",
              fontFamily: "var(--font-noto-jp), sans-serif",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M8 5v3.5M8 11.2v.1"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            ログインできない場合
          </div>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.75,
              color: "var(--ink-3)",
              margin: 0,
              fontFamily: "var(--font-noto-jp), sans-serif",
            }}
          >
            ブラウザのポップアップブロックを解除し、サードパーティ Cookie が有効か確認してください。
            それでも解決しない場合は{" "}
            <a href="#" style={{ ...ftLink, color: "var(--teal-deep)" }}>
              サポート
            </a>{" "}
            までご連絡ください。
          </p>
        </div>
      </div>
    </div>
  );
}
