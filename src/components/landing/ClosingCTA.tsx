import Link from "next/link";

export function ClosingCTA() {
  return (
    <section style={{ paddingTop: 60, paddingBottom: 100 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            borderRadius: 28,
            padding: "72px 64px",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 60,
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* decorative rings */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -120,
              top: -120,
              width: 360,
              height: 360,
              borderRadius: 999,
              border: "1px solid rgba(246,244,237,0.08)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: -60,
              top: -60,
              width: 240,
              height: 240,
              borderRadius: 999,
              border: "1px solid rgba(246,244,237,0.10)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: 40,
              top: 40,
              width: 120,
              height: 120,
              borderRadius: 999,
              background: "color-mix(in oklch, var(--teal) 20%, transparent)",
              filter: "blur(2px)",
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              className="mono"
              style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal)", marginBottom: 20 }}
            >
              — GET STARTED
            </div>
            <h2
              style={{
                fontSize: 40,
                lineHeight: 1.3,
                letterSpacing: -0.6,
                fontWeight: 700,
                margin: "0 0 18px",
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              次の面接の前に、
              <br />
              一度、自分の言葉を整える。
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.85,
                opacity: 0.7,
                margin: 0,
                maxWidth: 480,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              アカウント作成は不要。学校・所属メールでログインしてすぐに練習を始められます。
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              position: "relative",
            }}
          >
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "18px 28px",
                background: "var(--bg)",
                color: "var(--ink)",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 700,
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
            <div className="mono" style={{ fontSize: 11, opacity: 0.55, letterSpacing: 0.5 }}>
              FREE · NO CREDIT CARD REQUIRED
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
