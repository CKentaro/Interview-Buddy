"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { LcArrowLeft, LcCheck, LcAlert, LcChevronDown } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

type AuthState = "idle" | "authenticating" | "success" | "error";

export function LoginForm() {
  const [state, setState] = useState<AuthState>("idle");
  const [helpOpen, setHelpOpen] = useState(false);

  const startAuth = async () => {
    if (state === "authenticating") return;
    setState("authenticating");
    try {
      await signIn("google", { redirectTo: "/home" });
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px 32px" }}>
        <Link href="/" className="ib-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <LcArrowLeft size={15} />
          <span>トップに戻る</span>
        </Link>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "min(420px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 20, marginBottom: 6, letterSpacing: "-0.02em" }}>interview buddy</div>
            <h1 style={{ fontSize: 22, margin: "0 0 6px", fontFamily: "var(--font-jp)" }}>ログインしてはじめましょう</h1>
            <p style={{ fontSize: 13, margin: 0, color: muted(60), fontFamily: "var(--font-jp)" }}>Google アカウントで、安全にログインできます。</p>
          </div>

          {state === "idle" && (
            <div className="card elev-md" style={{ padding: 24, gap: 16, animation: "ib-pop .35s ease both" }}>
              <button className="btn-google" onClick={startAuth} style={{ width: "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/google-g.svg" alt="" width={20} height={20} />
                <span>Google で続ける</span>
              </button>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.7, color: muted(55), fontFamily: "var(--font-jp)" }}>
                続行することで、<a href="#" className="ib-link" style={{ fontSize: 11.5 }}>利用規約</a>と<a href="#" className="ib-link" style={{ fontSize: 11.5 }}>プライバシーポリシー</a>に同意したものとみなされます。
              </p>
            </div>
          )}

          {state === "authenticating" && (
            <div className="card elev-md" style={{ padding: 24, gap: 12, alignItems: "center", textAlign: "center", animation: "ib-pop .35s ease both" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-accent-500)", animation: "ib-breathe 1.6s ease-in-out infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--font-jp)" }}>認証しています…</div>
              <p style={{ margin: 0, fontSize: 12.5, color: muted(55), fontFamily: "var(--font-jp)" }}>Google の確認画面で操作された場合、少し時間がかかることがあります。</p>
            </div>
          )}

          {state === "success" && (
            <div className="card elev-md" style={{ padding: 24, gap: 12, alignItems: "center", textAlign: "center", animation: "ib-pop .35s ease both" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-accent-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent-700)" }}>
                <LcCheck size={20} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: "var(--font-jp)" }}>ログインしました</div>
              <p style={{ margin: 0, fontSize: 12.5, color: muted(55), fontFamily: "var(--font-jp)" }}>ホームにご案内しています…</p>
            </div>
          )}

          {state === "error" && (
            <div className="card elev-md" style={{ padding: 24, gap: 12, animation: "ib-pop .35s ease both" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "var(--color-accent-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent-700)" }}>
                  <LcAlert size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>ログインできませんでした</div>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.7, color: muted(60), fontFamily: "var(--font-jp)" }}>通信状況の問題か、Google 側での確認が完了しなかった可能性があります。もう一度お試しください。</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button className="btn btn-secondary" onClick={() => setState("idle")} style={{ flex: 1, justifyContent: "center" }}>閉じる</button>
                <button className="btn btn-primary" onClick={startAuth} style={{ flex: 1, justifyContent: "center" }}>もう一度試す</button>
              </div>
            </div>
          )}

          <div className="card elev-sm" style={{ padding: 16, gap: 8 }}>
            <button
              onClick={() => setHelpOpen((o) => !o)}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-jp)" }}>ログインできないときは</span>
              <LcChevronDown size={16} open={helpOpen} />
            </button>
            {helpOpen && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.9, color: muted(65), fontFamily: "var(--font-jp)" }}>
                <li>ブラウザでポップアップがブロックされていないか、ご確認ください。</li>
                <li>サードパーティ Cookie の許可が必要です。プライベートブラウズ中は無効になる場合があります。</li>
                <li>解決しない場合は、<a href="#" className="ib-link" style={{ fontSize: 12.5 }}>サポートにお問い合わせ</a>ください。</li>
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
