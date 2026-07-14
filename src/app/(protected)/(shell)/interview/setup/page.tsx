"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LcArrowLeft, LcAlert } from "@/components/ui/icons";
import type { SessionResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

/* ── Static data ── */
const INDUSTRY: Record<string, string[]> = {
  "IT・Web": ["Web開発", "SaaS", "ゲーム", "データ / AI", "セキュリティ", "EC・広告"],
  "メーカー・商社": ["電機", "自動車", "機械", "化学・素材", "食品・飲料", "総合商社", "専門商社"],
  "金融・保険": ["銀行", "証券", "保険", "クレジット・信販", "資産運用"],
  "流通・小売・サービス": ["百貨店・スーパー", "専門店", "ホテル・旅行", "飲食", "教育"],
  "医療・福祉": ["病院・クリニック", "製薬", "医療機器", "看護・介護"],
  "コンサル・士業": ["経営コンサル", "ITコンサル", "人事コンサル", "会計・税務", "法務"],
};
const ROLE: Record<string, string[]> = {
  エンジニア: ["フロントエンド", "バックエンド", "インフラ / SRE", "モバイル", "データ / ML"],
  "企画・マーケティング": ["商品企画", "マーケティング", "広報", "経営企画"],
  営業: ["法人営業", "個人営業", "海外営業", "カスタマーサクセス"],
  コーポレート: ["人事", "経理・財務", "法務", "総務"],
  "クリエイティブ": ["UIデザイナー", "UXデザイナー", "グラフィック", "ゲームデザイン"],
};
const PHASES = [
  { key: "first", label: "一次面接", desc: "人柄や基本的な適性を、対話を通じて確認します。" },
  { key: "second", label: "二次面接", desc: "これまでの経験を深掘りし、実務との適合を見ます。" },
  { key: "final", label: "最終面接", desc: "意思の確認が中心です。役員クラスとの対話を想定します。" },
];
const INTERVIEWERS = [
  { key: "friendly", label: "フレンドリー", desc: "和やかな雰囲気で、話しやすく進行します。" },
  { key: "neutral", label: "ニュートラル", desc: "淡々とした、標準的な進行です。" },
  { key: "strict", label: "厳しめ", desc: "圧迫気味の追及を再現します。" },
];
const STEP_TITLES = ["志望業界", "志望企業・職種", "選考フェーズ", "面接の雰囲気", "確認"];
const STEP_TOTAL = STEP_TITLES.length;

type FormData = {
  industryMajor: string; industryMinor: string;
  companyName: string; roleMajor: string; roleMinor: string;
  phase: string; interviewerType: string; voiceOn: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Choice({ label, desc, active, onSelect }: { label: string; desc: string; active: boolean; onSelect: () => void }) {
  return (
    <button className={`ib-choice${active ? " ib-choice-active" : ""}`} onClick={onSelect} type="button">
      <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{label}</div>
      <div style={{ fontSize: 12.5, color: muted(60), fontFamily: "var(--font-jp)" }}>{desc}</div>
    </button>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [form, setForm] = useState<FormData>({
    industryMajor: "", industryMinor: "", companyName: "",
    roleMajor: "", roleMinor: "", phase: "", interviewerType: "", voiceOn: true,
  });

  const patch = (p: Partial<FormData>) => { setForm((f) => ({ ...f, ...p })); setShowHint(false); };

  const isStepValid = (s: number): boolean => {
    if (s === 0) return !!form.industryMajor && !!form.industryMinor;
    if (s === 1) return !!form.companyName.trim() && !!form.roleMajor && !!form.roleMinor;
    if (s === 2) return !!form.phase;
    if (s === 3) return !!form.interviewerType;
    return true;
  };

  const goBack = () => { setStep((s) => Math.max(0, s - 1)); setShowHint(false); };
  const goNext = () => {
    if (!isStepValid(step)) { setShowHint(true); return; }
    setStep((s) => Math.min(STEP_TOTAL - 1, s + 1)); setShowHint(false);
  };

  const fillSample = () => setForm({
    industryMajor: "IT・Web", industryMinor: "Web開発",
    companyName: "株式会社リンデン", roleMajor: "エンジニア", roleMinor: "フロントエンド",
    phase: "second", interviewerType: "neutral", voiceOn: true,
  });

  const startInterview = async () => {
    setStarting(true); setStartError(false);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          industryMajor: form.industryMajor,
          industryMinor: form.industryMinor,
          jobMajor: form.roleMajor,
          jobMinor: form.roleMinor,
          selectionStage: form.phase,
          interviewerType: form.interviewerType,
          voiceEnabled: form.voiceOn,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const session = (await res.json()) as SessionResponse;
      sessionStorage.setItem("ib-session", JSON.stringify({
        sessionId: session.sessionId,
        voiceEnabled: form.voiceOn,
        question: session.firstQuestion,
        questionNumber: 1,
      }));
      router.push(`/interview/${session.sessionId}/live`);
    } catch (e) {
      console.error(e);
      setStartError(true);
      setStarting(false);
    }
  };

  const phaseLabel = PHASES.find((p) => p.key === form.phase)?.label ?? "未設定";
  const typeLabel = INTERVIEWERS.find((t) => t.key === form.interviewerType)?.label ?? "未設定";
  const summary = [
    { label: "志望業界", value: form.industryMajor ? `${form.industryMajor} ／ ${form.industryMinor}` : "未設定", goto: 0 },
    { label: "志望企業・職種", value: `${form.companyName || "未設定"}${form.roleMajor ? `　・　${form.roleMajor} ／ ${form.roleMinor}` : ""}`, goto: 1 },
    { label: "選考フェーズ", value: phaseLabel, goto: 2 },
    { label: "面接官タイプ・音声", value: `${typeLabel}　・　音声${form.voiceOn ? "あり" : "なし"}`, goto: 3 },
  ];

  return (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "36px 32px 56px" }}>
        <div style={{ width: "min(640px, 100%)", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* top actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Link href="/home" className="ib-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <LcArrowLeft size={15} />
              <span>設定を中断してホームに戻る</span>
            </Link>
            <button className="btn btn-ghost" onClick={fillSample} style={{ fontSize: 12 }}>サンプル値を入力</button>
          </div>

          {/* progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: muted(55), fontFamily: "var(--font-jp)" }}>ステップ {step + 1} / {STEP_TOTAL}</div>
              <div style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>{STEP_TITLES[step]}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {STEP_TITLES.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 999,
                  background: i <= step ? "var(--color-accent-500)" : "var(--color-neutral-300)",
                  boxShadow: i === step ? "0 0 0 4px var(--color-accent-100)" : "none",
                }} />
              ))}
            </div>
          </div>

          <div className="card elev-md ib-section" key={step} style={{ padding: 24, gap: 16 }}>
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19, fontFamily: "var(--font-jp)" }}>志望業界を教えてください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>大まかな分野から、当てはまるものを選んでください。</p>
                </div>
                <Field label="業界（大分類）">
                  <select className="input" value={form.industryMajor} onChange={(e) => patch({ industryMajor: e.target.value, industryMinor: "" })}>
                    <option value="">選択してください</option>
                    {Object.keys(INDUSTRY).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {form.industryMajor && (
                  <Field label="業界（小分類）">
                    <select className="input" value={form.industryMinor} onChange={(e) => patch({ industryMinor: e.target.value })}>
                      <option value="">選択してください</option>
                      {(INDUSTRY[form.industryMajor] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19, fontFamily: "var(--font-jp)" }}>志望企業と職種を教えてください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>企業名は自由に入力できます。</p>
                </div>
                <Field label="志望企業名">
                  <input className="input" type="text" placeholder="例：株式会社リンデン" value={form.companyName} onChange={(e) => patch({ companyName: e.target.value })} />
                </Field>
                <Field label="職種（大分類）">
                  <select className="input" value={form.roleMajor} onChange={(e) => patch({ roleMajor: e.target.value, roleMinor: "" })}>
                    <option value="">選択してください</option>
                    {Object.keys(ROLE).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                {form.roleMajor && (
                  <Field label="職種（小分類）">
                    <select className="input" value={form.roleMinor} onChange={(e) => patch({ roleMinor: e.target.value })}>
                      <option value="">選択してください</option>
                      {(ROLE[form.roleMajor] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19, fontFamily: "var(--font-jp)" }}>選考フェーズを選んでください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>フェーズによって、面接の性格が変わります。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {PHASES.map((p) => <Choice key={p.key} label={p.label} desc={p.desc} active={form.phase === p.key} onSelect={() => patch({ phase: p.key })} />)}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19, fontFamily: "var(--font-jp)" }}>面接の雰囲気を選んでください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>AI がこのトーンを再現します。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {INTERVIEWERS.map((t) => <Choice key={t.key} label={t.label} desc={t.desc} active={form.interviewerType === t.key} onSelect={() => patch({ interviewerType: t.key })} />)}
                </div>
                <div className="hr" style={{ margin: 0 }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>AI の音声で質問を読み上げる</div>
                    <div style={{ fontSize: 12.5, color: muted(60), fontFamily: "var(--font-jp)" }}>オフにすると、テキストのみで進行します。</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ voiceOn: !form.voiceOn })}
                    aria-pressed={form.voiceOn}
                    style={{ all: "unset", cursor: "pointer", width: 44, height: 26, borderRadius: 999, background: form.voiceOn ? "var(--color-accent-500)" : "var(--color-neutral-300)", position: "relative", flex: "none", transition: "background .15s ease" }}
                  >
                    <span style={{ position: "absolute", top: 2, left: form.voiceOn ? 20 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-sm)", transition: "left .15s ease" }} />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19, fontFamily: "var(--font-jp)" }}>内容を確認しましょう</h2>
                  <p style={{ margin: 0, fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>この内容で、面接練習を準備します。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {summary.map((row, i) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < summary.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 11, color: muted(55), fontFamily: "var(--font-jp)" }}>{row.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{row.value}</div>
                      </div>
                      <button className="btn btn-ghost" onClick={() => setStep(row.goto)} style={{ fontSize: 12 }}>編集</button>
                    </div>
                  ))}
                </div>
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 12.5, lineHeight: 1.7, color: muted(65), fontFamily: "var(--font-jp)" }}>
                  面接はいつでも途中で中断できます。中断しても、それまでの内容は保存されます。
                </div>
                {startError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--color-accent-100)" }}>
                    <span style={{ flex: "none", marginTop: 2, color: "var(--color-accent-700)" }}><LcAlert size={16} /></span>
                    <div style={{ fontSize: 12.5, color: "var(--color-accent-800)", lineHeight: 1.7, fontFamily: "var(--font-jp)" }}>面接の準備を開始できませんでした。通信状況をご確認のうえ、もう一度お試しください。</div>
                  </div>
                )}
                <button className="btn btn-primary" onClick={startInterview} disabled={starting} style={{ width: "100%", justifyContent: "center", padding: 14, fontSize: 15, gap: 8 }}>
                  {starting ? (
                    <>
                      <span style={{ width: 15, height: 15, border: "2px solid color-mix(in srgb, #fff 40%, transparent)", borderTopColor: "#fff", borderRadius: "50%", animation: "ib-spin .8s linear infinite" }} />
                      <span>準備しています…</span>
                    </>
                  ) : (
                    <span>この内容で面接をはじめる</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* nav */}
          {step < 4 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <button className="btn btn-secondary" onClick={goBack} disabled={step === 0} style={step === 0 ? { opacity: 0, pointerEvents: "none" } : undefined}>戻る</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {showHint && <span style={{ fontSize: 12, color: "var(--color-accent-700)", fontFamily: "var(--font-jp)" }}>すべての項目を選択してください</span>}
                <button className="btn btn-primary" onClick={goNext}>次へ</button>
              </div>
            </div>
          )}
        </div>
    </main>
  );
}
