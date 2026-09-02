
export function LandingFooter() {
  return (
    <footer className="ib-footer">
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14 }}>interview buddy</div>
        <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["利用規約", "プライバシーポリシー", "お問い合わせ", "運営会社"].map((l) => (
            <a key={l} href="#" className="ib-link" style={{ fontSize: 12 }}>{l}</a>
          ))}
        </nav>
        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>© 2026 interview buddy</div>
      </div>
    </footer>
  );
}
