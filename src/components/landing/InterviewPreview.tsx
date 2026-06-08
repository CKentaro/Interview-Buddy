"use client";

import { useState, useEffect } from "react";

const AXES = [
  { code: "01", name: "再現性", active: true },
  { code: "02", name: "価値観", active: true },
  { code: "03", name: "自己認識", active: false },
  { code: "04", name: "世界観", active: false },
];

export function InterviewPreview() {
  // Initialize with stable values to avoid SSR/client hydration mismatch
  const [bars, setBars] = useState<number[]>(Array.from({ length: 28 }, () => 0.5));

  useEffect(() => {
    setBars(Array.from({ length: 28 }, () => 0.3 + Math.random() * 0.7));
    const t = setInterval(() => {
      setBars(Array.from({ length: 28 }, () => 0.25 + Math.random() * 0.75));
    }, 220);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      {/* floating evaluation tag */}
      <div
        style={{
          position: "absolute",
          top: -18,
          right: 28,
          zIndex: 3,
          background: "var(--ink)",
          color: "var(--bg)",
          padding: "10px 14px",
          borderRadius: 12,
          fontSize: 12,
          lineHeight: 1.5,
          boxShadow: "0 8px 24px rgba(11,23,51,0.18)",
          maxWidth: 220,
          fontFamily: "var(--font-noto-jp), sans-serif",
        }}
      >
        <div className="mono" style={{ fontSize: 10, opacity: 0.6, letterSpacing: 0.8, marginBottom: 4 }}>
          AXIS 01 / 再現性
        </div>
        <div>具体的なエピソードから一般化された学びへの接続が丁寧です。</div>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--line)",
          borderRadius: 20,
          padding: 28,
          boxShadow:
            "0 20px 60px -20px rgba(11,23,51,0.18), 0 2px 8px rgba(11,23,51,0.04)",
        }}
      >
        {/* window header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--teal)",
                boxShadow: "0 0 0 4px color-mix(in oklch, var(--teal) 18%, transparent)",
              }}
            />
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: 0.6 }}>
              SESSION · 12:34
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            Q. 03 / 06
          </div>
        </div>

        {/* AI bubble */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 10,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <div
            style={{
              background: "var(--bg-tint)",
              padding: "12px 16px",
              borderRadius: "4px 14px 14px 14px",
              fontSize: 14,
              lineHeight: 1.75,
              color: "var(--ink)",
              fontFamily: "var(--font-noto-jp), sans-serif",
              maxWidth: "85%",
            }}
          >
            学生時代に最も力を入れた経験について教えてください。
            <br />
            <span style={{ color: "var(--ink-3)" }}>
              結果よりも、過程での意思決定に興味があります。
            </span>
          </div>
        </div>

        {/* user waveform bubble */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "var(--ink)",
              padding: "14px 18px",
              borderRadius: "14px 4px 14px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 2, height: 24 }}>
              {bars.map((h, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: 2,
                    height: `${h * 22}px`,
                    background: i % 3 === 0 ? "var(--teal)" : "rgba(246,244,237,0.85)",
                    borderRadius: 2,
                    transition: "height .22s ease",
                  }}
                />
              ))}
            </div>
            <span
              className="mono"
              style={{ fontSize: 11, color: "rgba(246,244,237,0.7)", letterSpacing: 0.5 }}
            >
              00:42
            </span>
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 10,
              background: "var(--blue-soft)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--font-noto-jp), sans-serif",
            }}
          >
            あ
          </div>
        </div>

        {/* follow-up chip */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            background: "var(--bg)",
            border: "1px dashed var(--line-strong)",
            borderRadius: 999,
            fontSize: 12,
            color: "var(--ink-3)",
            fontFamily: "var(--font-noto-jp), sans-serif",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          AI が深掘り質問を準備中…
        </div>

        {/* axes mini grid */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 22,
            borderTop: "1px solid var(--line)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {AXES.map((a) => (
            <div key={a.code}>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  letterSpacing: 0.6,
                  color: a.active ? "var(--teal-deep)" : "var(--ink-4)",
                }}
              >
                AXIS {a.code}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 2,
                  color: a.active ? "var(--ink)" : "var(--ink-4)",
                  fontFamily: "var(--font-noto-jp), sans-serif",
                }}
              >
                {a.name}
              </div>
              <div
                style={{
                  height: 3,
                  marginTop: 6,
                  borderRadius: 999,
                  background: a.active ? "var(--teal)" : "var(--line)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="mono"
        style={{
          position: "absolute",
          left: -8,
          bottom: -28,
          fontSize: 10,
          color: "var(--ink-4)",
          letterSpacing: 0.5,
        }}
      >
        ↑ ACTUAL INTERVIEW SCREEN — PREVIEW
      </div>
    </div>
  );
}
