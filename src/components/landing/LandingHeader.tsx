import Link from "next/link";
import { LcUser } from "@/components/ui/icons";

export function LandingHeader() {
  return (
    <header
      style={{
        padding: "16px 0",
        borderBottom: "1px solid var(--color-divider)",
        background: "var(--color-bg)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="ib-landing-inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>
          interview buddy
        </div>
        <Link href="/login" className="btn btn-primary" style={{ gap: 8, whiteSpace: "nowrap" }}>
          <LcUser size={16} />
          <span>ログイン</span>
        </Link>
      </div>
    </header>
  );
}
