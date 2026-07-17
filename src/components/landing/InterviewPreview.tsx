import { LcMic } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

/** Hero visual — a calm re-creation of the live interview screen. */
export function InterviewPreview() {
  return (
    <div className="card elev-md" style={{ padding: 20, gap: 16, background: "var(--color-bg)", border: "1px solid var(--color-divider)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>質問 3 / 6</span>
        <span style={{ fontSize: 11, color: muted(50), fontFamily: "var(--font-jp)" }}>音声 ON</span>
      </div>
      <div style={{ height: 3, background: "var(--color-neutral-200)", borderRadius: 999 }}>
        <div style={{ height: "100%", width: "42%", background: "var(--color-accent-400)", borderRadius: 999 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 0" }}>
        <div style={{ position: "relative", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", background: "var(--color-accent-200)", animation: "ib-breathe-ring 2s ease-out infinite" }} />
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-accent-400)", animation: "ib-breathe 2s ease-in-out infinite" }} />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: muted(70), fontFamily: "var(--font-jp)" }}>次の質問を考えています…</div>
      </div>

      <div style={{ padding: 16, background: "var(--color-surface)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="tag tag-accent" style={{ alignSelf: "flex-start" }}>経験について</span>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, fontWeight: 600, fontFamily: "var(--font-jp)" }}>これまでのお仕事で、最も工夫や苦労をした経験を教えてください。</div>
      </div>

      <div style={{ position: "relative" }}>
        <div className="input" style={{ minHeight: 64, paddingRight: 44, color: muted(45), fontSize: 13, display: "flex", alignItems: "center" }}>ここに回答を入力するか、マイクで話してください</div>
        <span style={{ position: "absolute", right: 6, bottom: 6, width: 30, height: 30, borderRadius: "50%", background: "var(--color-accent-400)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <LcMic size={14} />
        </span>
      </div>
    </div>
  );
}
