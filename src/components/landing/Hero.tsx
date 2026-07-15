import Link from "next/link";
import { LcUser } from "@/components/ui/icons";
import { InterviewPreview } from "./InterviewPreview";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

export function Hero() {
  return (
    <section
      className="ib-hero"
      style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 32px 24px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 32, alignItems: "center" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>interview buddy</span>
        <h1 style={{ fontSize: 44, lineHeight: 1.25, margin: 0, maxWidth: "16ch", fontFamily: "var(--font-jp)" }}>
          面接を、もっと落ち着いて<br />練習できる場所に。
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.8, margin: 0, maxWidth: "46ch", color: muted(75), fontFamily: "var(--font-jp)" }}>
          AIと対話しながら、模擬面接を行います。点数や偏差値ではなく「ことば」で気づきを受け取り、自分の語り方を少しずつ整えていけます。
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: 15, gap: 10 }}>
            <LcUser size={18} />
            <span>Googleでログインしてはじめる</span>
          </Link>
          <span style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>1回あたり、目安5分からはじめられます。</span>
        </div>
      </div>

      <InterviewPreview />
    </section>
  );
}
