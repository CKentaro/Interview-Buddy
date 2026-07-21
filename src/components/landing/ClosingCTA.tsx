import Link from "next/link";
import { LcUser } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

export function ClosingCTA() {
  return (
    <section className="ib-band" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
      <div className="card elev-sm ib-cta-card">
        <h3 className="ib-cta-title">はじめる前に、緊張しなくて大丈夫です。</h3>
        <p style={{ margin: 0, fontSize: 14, color: muted(70), maxWidth: "56ch", fontFamily: "var(--font-jp)" }}>
          いつでも中断でき、途中までの記録は保存されます。ひとりで、自分のペースで練習を重ねていけます。
        </p>
        <div>
          <Link href="/login" className="btn btn-primary ib-btn-wide" style={{ padding: "12px 24px", fontSize: 14, gap: 8, marginTop: 8 }}>
            <LcUser size={16} />
            <span>Googleでログインしてはじめる</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
