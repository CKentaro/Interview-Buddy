/* Pure CSS animations — no client component needed */

function SampleFlow() {
  const steps = [
    { c: "01", t: "アイスブレイク" },
    { c: "02", t: "経験を聞く" },
    { c: "03", t: "深掘り質問", active: true },
    { c: "04", t: "価値観を問う" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            background: s.active ? "var(--ink)" : "transparent",
            color: s.active ? "var(--bg)" : "var(--ink-2)",
            border: s.active ? "1px solid var(--ink)" : "1px solid var(--line)",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          <span className="mono" style={{ fontSize: 10, opacity: s.active ? 0.7 : 0.5 }}>
            {s.c}
          </span>
          <span style={{ fontWeight: 500 }}>{s.t}</span>
          {s.active && (
            <span style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
              {[0, 0.2, 0.4].map((d, j) => (
                <span
                  key={j}
                  style={{
                    display: "inline-block",
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--teal)",
                    animation: `pulse 1.2s ${d}s ease-in-out infinite`,
                  }}
                />
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function SampleAxes() {
  const axes = [
    { c: "01", n: "再現性", t: "思考プロセスを構造化して語れているか" },
    { c: "02", n: "価値観・判断軸", t: "自分の価値観を具体に言語化できているか" },
    { c: "03", n: "自己認識", t: "強み・弱みを適切な粒度で語れているか" },
    { c: "04", n: "世界観・知的好奇心", t: "関心を面接の文脈で表現できているか" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {axes.map((a, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 12,
            alignItems: "baseline",
            padding: "6px 0",
            borderBottom: i < axes.length - 1 ? "1px solid var(--line)" : "none",
          }}
        >
          <span className="mono" style={{ fontSize: 10, color: "var(--teal-deep)", letterSpacing: 0.6 }}>
            {a.c}
          </span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              {a.n}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ink-3)",
                marginTop: 1,
                lineHeight: 1.55,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              {a.t}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SampleHistory() {
  const sessions = [
    { d: "05.18", c: "外資コンサル / 一次", on: true },
    { d: "05.12", c: "メガベンチャー / 二次", on: false },
    { d: "05.04", c: "外資コンサル / 一次", on: false },
    { d: "04.27", c: "事業会社 / 最終", on: false },
  ];

  return (
    <div style={{ position: "relative", padding: "4px 0 4px 18px" }}>
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 8,
          bottom: 8,
          width: 1,
          background: "var(--line-strong)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sessions.map((s, i) => (
          <div
            key={i}
            style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}
          >
            <span
              style={{
                position: "absolute",
                left: -18,
                top: "50%",
                transform: "translateY(-50%)",
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: 999,
                background: s.on ? "var(--teal)" : "var(--bg)",
                border: s.on ? "none" : "1px solid var(--line-strong)",
                boxShadow: s.on
                  ? "0 0 0 3px color-mix(in oklch, var(--teal) 18%, transparent)"
                  : "none",
              }}
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", width: 36 }}>
              {s.d}
            </span>
            <span
              style={{
                fontSize: 12,
                color: s.on ? "var(--ink)" : "var(--ink-3)",
                fontWeight: s.on ? 600 : 400,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              {s.c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURE_LIST = [
  {
    kicker: "FEATURE 01",
    title: "AI面接シミュレーション",
    lead: "構造化フロー + 深掘り質問",
    body: "業界・職種・面接種別を設定すると、AI が一次面接から最終面接まで自然な流れで進行。回答内容に応じてその場で深掘り質問を生成します。",
    sample: <SampleFlow />,
  },
  {
    kicker: "FEATURE 02",
    title: "4軸の質的フィードバック",
    lead: "点数ではなく、ことばで返す",
    body: "再現性 / 価値観・判断軸 / 自己認識 / 世界観・知的好奇心 の4軸ごとに、AI が文章で具体的な気づきを返します。スコアは出しません。",
    sample: <SampleAxes />,
  },
  {
    kicker: "FEATURE 03",
    title: "練習履歴の振り返り",
    lead: "過去の自分と比較する",
    body: "すべてのセッションが時系列で保存され、評価軸ごとの変化や繰り返し現れる傾向を、いつでも見返すことができます。",
    sample: <SampleHistory />,
  },
];

export function Features() {
  return (
    <section
      id="features"
      style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 100,
        paddingBottom: 120,
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        {/* section header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: 60,
            marginBottom: 72,
            alignItems: "end",
          }}
        >
          <div>
            <div
              className="mono"
              style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 16 }}
            >
              — WHAT IT DOES
            </div>
            <h2
              style={{
                fontSize: 44,
                lineHeight: 1.25,
                letterSpacing: -0.8,
                fontWeight: 700,
                margin: 0,
                fontFamily: "var(--font-noto-jp), sans-serif",
              }}
            >
              面接練習を、
              <br />
              3つのしくみで支える。
            </h2>
          </div>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.85,
              color: "var(--ink-3)",
              margin: 0,
              maxWidth: 540,
              justifySelf: "end",
              fontFamily: "var(--font-noto-jp), sans-serif",
            }}
          >
            「うまく話せたか」を採点するのではなく、「自分の語り方をどう整えていくか」を支える設計。
            シミュレーション・フィードバック・履歴。3つが緩やかにつながっています。
          </p>
        </div>

        {/* 3-col grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid var(--line)",
          }}
        >
          {FEATURE_LIST.map((it, i) => (
            <div
              key={i}
              style={{
                padding: "44px 32px 36px",
                borderRight: i < FEATURE_LIST.length - 1 ? "1px solid var(--line)" : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--ink-4)", marginBottom: 28 }}
              >
                {it.kicker}
              </div>
              <div style={{ marginBottom: 28, minHeight: 160 }}>{it.sample}</div>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: -0.3,
                  margin: "0 0 6px",
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {it.title}
              </h3>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--teal-deep)",
                  fontWeight: 600,
                  marginBottom: 14,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {it.lead}
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: "var(--ink-3)",
                  margin: 0,
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
