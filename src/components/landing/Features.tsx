import { LcMessage, LcEye, LcHistory, LcSliders } from "@/components/ui/icons";

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-accent-100)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent-700)" }}>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" style={{ maxWidth: 1120, margin: "0 auto", padding: 32 }}>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>how it works</span>
      <h2 style={{ fontSize: 30, margin: "8px 0 24px", fontFamily: "var(--font-jp)" }}>interview buddy の仕組み</h2>

      <div className="ib-how-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card elev-sm" style={{ padding: 16, gap: 12 }}>
          <IconTile><LcMessage size={20} /></IconTile>
          <div className="card-title">面接シミュレーション</div>
          <p className="card-body" style={{ opacity: 0.85 }}>一次面接から最終面接まで、自然な流れで進行します。あなたの回答に応じて、その場で深掘りする質問が生まれます。</p>
        </div>

        <div className="card elev-sm" style={{ padding: 16, gap: 12 }}>
          <IconTile><LcEye size={20} /></IconTile>
          <div className="card-title">4つの評価軸で気づきをことばに</div>
          <p className="card-body" style={{ opacity: 0.85, marginBottom: 2 }}>点数はつけません。再現性・価値観、判断軸・自己認識・世界観、知的好奇心という4つの視点から、具体的な気づきを文章でお伝えします。</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["再現性", "価値観・判断軸", "自己認識", "世界観・知的好奇心"].map((t) => (
              <div key={t} style={{ padding: "4px 10px", border: "1px solid var(--color-divider)", borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{t}</div>
            ))}
          </div>
        </div>

        <div className="card elev-sm" style={{ padding: 16, gap: 12 }}>
          <IconTile><LcHistory size={20} /></IconTile>
          <div className="card-title">練習履歴の振り返り</div>
          <p className="card-body" style={{ opacity: 0.85 }}>終えたセッションは、いつでも見返せます。積み重ねの中で、自分の話し方の傾向や変化に気づいていけます。</p>
        </div>

        <div className="card elev-sm" style={{ padding: 16, gap: 12 }}>
          <IconTile><LcSliders size={20} /></IconTile>
          <div className="card-title">採点ではなく、語り方を整える設計</div>
          <p className="card-body" style={{ opacity: 0.85 }}>「うまく話せたか」を測るためのサービスではありません。次にどう話すかを、一緒にゆっくり考えるための場所です。</p>
        </div>
      </div>
    </section>
  );
}
