import { LcMessage, LcEye, LcHistory, LcSliders } from "@/components/ui/icons";

/** 評価軸の色はフィードバック画面と揃える（SessionDetailView の AXIS_META と同じ）。 */
const AXIS_TAGS = [
  { label: "再現性", color: "var(--axis-reproducibility)" },
  { label: "価値観・判断軸", color: "var(--axis-values)" },
  { label: "自己認識", color: "var(--axis-self)" },
  { label: "世界観・知的好奇心", color: "var(--axis-worldview)" },
];

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
      {children}
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="ib-band">
      <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>how it works</span>
      <h2 className="ib-how-title">interview buddy の仕組み</h2>

      <div className="ib-how-grid">
        <div className="card" style={{ padding: 20, gap: 12 }}>
          <IconTile><LcMessage size={20} /></IconTile>
          <div className="card-title">面接シミュレーション</div>
          <p className="card-body">一次面接から最終面接まで、自然な流れで進行します。あなたの回答に応じて、その場で深掘りする質問が生まれます。</p>
        </div>

        <div className="card" style={{ padding: 20, gap: 12 }}>
          <IconTile><LcEye size={20} /></IconTile>
          <div className="card-title">4つの評価軸で気づきをことばに</div>
          <p className="card-body" style={{ marginBottom: 2 }}>点数はつけません。再現性・価値観、判断軸・自己認識・世界観、知的好奇心という4つの視点から、具体的な気づきを文章でお伝えします。</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AXIS_TAGS.map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--color-divider)", borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, gap: 12 }}>
          <IconTile><LcHistory size={20} /></IconTile>
          <div className="card-title">練習履歴の振り返り</div>
          <p className="card-body">終えたセッションは、いつでも見返せます。積み重ねの中で、自分の話し方の傾向や変化に気づいていけます。</p>
        </div>

        <div className="card" style={{ padding: 20, gap: 12 }}>
          <IconTile><LcSliders size={20} /></IconTile>
          <div className="card-title">採点ではなく、語り方を整える設計</div>
          <p className="card-body">「うまく話せたか」を測るためのサービスではありません。次にどう話すかを、一緒にゆっくり考えるための場所です。</p>
        </div>
      </div>
    </section>
  );
}
