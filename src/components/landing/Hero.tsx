import Link from "next/link";
import { InterviewPreview } from "./InterviewPreview";

export function Hero() {
  return (
    <section
      style={{ paddingTop: 80, paddingBottom: 120, position: "relative", overflow: "hidden" }}
    >
      {/* dot grid background */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          backgroundImage: "radial-gradient(var(--line-strong) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 70% 30%, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 70% 30%, black 30%, transparent 70%)",
        }}
      />

      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 40px",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 80,
          alignItems: "center",
        }}
      >
        {/* ── left: copy ── */}
        <div>
          {/* beta badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 12px 6px 8px",
              background: "var(--bg-card)",
              border: "1px solid var(--line)",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-2)",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: "var(--teal)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              β
            </span>
            <span className="mono" style={{ letterSpacing: 0.4 }}>
              AI MOCK INTERVIEW
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.18,
              letterSpacing: -1,
              fontWeight: 700,
              margin: "0 0 24px",
              fontFamily: "var(--font-noto-jp), var(--font-manrope), sans-serif",
            }}
          >
            面接で語れる
            <br />
            <span style={{ color: "var(--ink)", position: "relative" }}>
              「自分」を、
              <span
                style={{
                  background:
                    "linear-gradient(transparent 65%, color-mix(in oklch, var(--teal) 35%, transparent) 65%)",
                }}
              >
                静かに磨く。
              </span>
            </span>
          </h1>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.8,
              color: "var(--ink-3)",
              margin: "0 0 40px",
              maxWidth: 520,
              fontFamily: "var(--font-noto-jp), sans-serif",
            }}
          >
            Interview Buddy は、AI とじっくり対話しながら模擬面接を行える練習サービスです。
            点数ではなく、
            <strong style={{ color: "var(--ink)", fontWeight: 600 }}>
              4つの評価軸ごとの言葉のフィードバック
            </strong>
            で、あなたの語り方を一歩ずつ整えていきます。
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 26px",
                background: "var(--ink)",
                color: "var(--bg)",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              ログインして始める
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <a
              href="#features"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink-2)",
                fontFamily: "var(--font-noto-jp), sans-serif",
                borderBottom: "1px solid var(--line-strong)",
                paddingBottom: 2,
              }}
            >
              サービスの仕組みを見る
            </a>
          </div>

          {/* stats strip */}
          <div
            style={{
              marginTop: 56,
              display: "flex",
              gap: 36,
              paddingTop: 28,
              borderTop: "1px solid var(--line)",
            }}
          >
            {[
              ["4軸", "質的フィードバック"],
              ["無制限", "練習回数"],
              ["全履歴", "保存・振り返り"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{k}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    marginTop: 2,
                    fontFamily: "var(--font-noto-jp), sans-serif",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── right: animated preview ── */}
        <InterviewPreview />
      </div>
    </section>
  );
}
