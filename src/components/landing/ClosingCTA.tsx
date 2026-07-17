import Link from "next/link";
import { LcUser } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

export function ClosingCTA() {
  return (
    <section style={{ maxWidth: 1120, margin: "0 auto", padding: 32, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
      <div className="card elev-sm" style={{ width: "100%", padding: "24px 32px", gap: 12, background: "var(--color-surface)" }}>
        <h3 style={{ margin: 0, fontSize: 24, fontFamily: "var(--font-jp)" }}>はじめる前に、緊張しなくて大丈夫です。</h3>
        <p style={{ margin: 0, fontSize: 14, color: muted(70), maxWidth: "56ch", fontFamily: "var(--font-jp)" }}>
          いつでも中断でき、途中までの記録は保存されます。ひとりで、自分のペースで練習を重ねていけます。
        </p>
        <div>
          <Link href="/login" className="btn btn-primary" style={{ padding: "12px 24px", fontSize: 14, gap: 8, marginTop: 8 }}>
            <LcUser size={16} />
            <span>Googleでログインしてはじめる</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
