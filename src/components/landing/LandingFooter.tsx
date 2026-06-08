import { Logo } from "@/components/ui/Logo";

const FOOTER_COLS = [
  { h: "サービス", l: ["特徴", "使い方", "評価軸について", "料金"] },
  { h: "サポート", l: ["よくある質問", "お問い合わせ", "リリースノート"] },
  { h: "ポリシー", l: ["利用規約", "プライバシー", "特定商取引法"] },
];

export function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--line)", paddingTop: 56, paddingBottom: 48 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: 60,
            marginBottom: 56,
          }}
        >
          <div>
            <Logo />
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: "var(--ink-3)",
                margin: "20px 0 0",
                maxWidth: 320,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              AIとの対話を通じて、面接で語る「自分」の輪郭を整えていく練習サービス。
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.h}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: "var(--ink)",
                  marginBottom: 16,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {col.h}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {col.l.map((li) => (
                  <li key={li}>
                    <a
                      href="#"
                      style={{
                        fontSize: 13,
                        color: "var(--ink-3)",
                        fontFamily: "var(--font-noto-jp), sans-serif",
                      }}
                    >
                      {li}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 28,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: 0.5 }}>
            © 2026 INTERVIEW BUDDY · BUILT FOR THOUGHTFUL INTERVIEWS
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {["X / Twitter", "note", "Contact"].map((s) => (
              <a
                key={s}
                href="#"
                style={{
                  fontSize: 12,
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
