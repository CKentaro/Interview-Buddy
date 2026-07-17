"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LcArrowLeft, LcAlert } from "@/components/ui/icons";
import { INTERVIEWER_TYPE_LABEL } from "@/domain/interview/model/InterviewerType.vo";
import type { SessionResponse, VoiceUsageResponse } from "@/app/api/types";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

/* ── Static data ── */
const INDUSTRY: Record<string, string[]> = {
  "メーカー・商社": ["自動車", "電気・電子", "機械", "化学・素材", "食品・飲料", "医薬品・医療機器", "家具・インテリア", "衣料・アパレル", "総合商社", "専門商社"],
  "金融・保険": ["銀行", "証券", "保険", "クレジットカード・信販", "リース", "資産運用・投資顧問"],
  "IT・インターネット": ["SIer・システム開発", "Web・インターネットサービス", "ソフトウェア・SaaS", "通信・インフラ", "ハードウェア・半導体", "ゲーム", "セキュリティ", "AI・データ", "EC・広告"],
  "流通・小売・サービス": ["百貨店", "スーパーマーケット", "コンビニエンスストア", "専門店（ファッション）", "専門店（電気・電子）", "通信販売・Eコマース", "ホテル・旅行", "飲食業", "理美容・エステ", "教育・研修"],
  "建築・不動産": ["ゼネコン・建築", "ハウスメーカー", "設計・建築", "不動産開発", "不動産仲介・管理"],
  メディカル: ["病院・クリニック", "製薬会社", "医療機器メーカー", "看護・介護施設", "医療関連サービス"],
  "マスコミ・メディア": ["新聞", "テレビ", "ラジオ", "出版", "広告代理店", "インターネットメディア"],
  "コンサルティング・士業": ["経営コンサルティング", "ITコンサルティング", "人事コンサルティング", "弁護士", "公認会計士", "税理士"],
  "運輸・物流": ["航空", "鉄道", "海運", "陸運・運送", "物流・倉庫"],
  エネルギー: ["電力", "ガス", "石油・石炭", "再生エネルギー"],
  エンターテインメント: ["ゲーム・アミューズメント", "映画・映像", "音楽・音響", "スポーツ"],
};
const ROLE: Record<string, string[]> = {
  技術系: ["ソフトウェアエンジニア", "システムエンジニア", "ネットワークエンジニア", "クラウドエンジニア", "データベースエンジニア", "セキュリティエンジニア", "モバイルアプリ開発者", "Webエンジニア", "フルスタックエンジニア", "DevOpsエンジニア", "MLエンジニア", "データサイエンティスト", "組み込みエンジニア", "その他エンジニア"],
  事務系: ["総務", "人事", "経理", "財務", "法務", "広報", "経営企画", "マーケ", "営業企画"],
  営業: ["法人営業", "個人営業", "海外営業", "技術営業", "インサイドセールス", "カスタマーサクセス"],
  クリエイティブ: ["Webデザイナー", "グラフィックデザイナー", "UIデザイナー", "UXデザイナー", "イラストレーター", "ゲームデザイナー"],
  コンサルティング: ["経営コンサル", "ITコンサル", "人事コンサル", "財務コンサル"],
  医療: ["医師", "看護師", "薬剤師", "臨床検査技師", "理学療法士", "作業療法士"],
  士業: ["弁護士", "公認会計士", "税理士", "司法書士", "行政書士", "社会保険労務士", "弁理士"],
};
const PHASES = [
  { key: "first", label: "一次面接", desc: "人柄や基本的な適性を、対話を通じて確認します。" },
  { key: "second", label: "二次面接", desc: "これまでの経験を深掘りし、実務との適合を見ます。" },
  { key: "final", label: "最終面接", desc: "意思の確認が中心です。役員クラスとの対話を想定します。" },
];
const INTERVIEWERS = [
  { key: "friendly", label: INTERVIEWER_TYPE_LABEL.friendly, desc: "和やかな雰囲気で、話しやすく進行します。" },
  { key: "neutral", label: INTERVIEWER_TYPE_LABEL.neutral, desc: "淡々とした、標準的な進行です。" },
  { key: "strict", label: INTERVIEWER_TYPE_LABEL.strict, desc: "圧迫気味の追及を再現します。" },
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
  const [voiceQuota, setVoiceQuota] = useState<VoiceUsageResponse | null>(null);
  const [form, setForm] = useState<FormData>({
    industryMajor: "", industryMinor: "", companyName: "",
    roleMajor: "", roleMinor: "", phase: "", interviewerType: "", voiceOn: false,
  });

  // 本日の音声ありセッション残回数を取得する（取得失敗時は表示を出さないだけ）。
  useEffect(() => {
    let cancelled = false;
    fetch("/api/voice-usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((quota: VoiceUsageResponse | null) => {
        if (cancelled || quota === null) return;
        setVoiceQuota(quota);
        if (quota.remaining <= 0) setForm((f) => ({ ...f, voiceOn: false }));
      })
      .catch(() => {
        /* 残回数表示は補助情報のため、失敗しても面接開始は妨げない */
      });
    return () => { cancelled = true; };
  }, []);

  const voiceExhausted = voiceQuota !== null && voiceQuota.remaining <= 0;

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
    industryMajor: "IT・インターネット", industryMinor: "Web・インターネットサービス",
    companyName: "株式会社interview buddy", roleMajor: "技術系", roleMinor: "Webエンジニア",
    phase: "second", interviewerType: "neutral", voiceOn: false,
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
      // サーバーが許可した音声可否を採用する（本日の音声枠が使用済みなら false に落ちる）。
      sessionStorage.setItem("ib-session", JSON.stringify({
        sessionId: session.sessionId,
        voiceEnabled: session.voiceEnabled,
        question: session.firstQuestion,
        questionNumber: 1,
        interviewerType: form.interviewerType,
        // 音声を要求したのに枠超過で無効化された場合のみ、ライブ画面で通知する。
        voiceLimited: form.voiceOn && !session.voiceEnabled,
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
            {process.env.NODE_ENV === "development" && (
              <button className="btn btn-ghost" onClick={fillSample} style={{ fontSize: 12 }}>サンプル値を入力</button>
            )}
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
                  <input className="input" type="text" placeholder="例：株式会社interview buddy" value={form.companyName} onChange={(e) => patch({ companyName: e.target.value })} />
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
                    {voiceQuota !== null && (
                      <div style={{ marginTop: 4, fontSize: 12, fontFamily: "var(--font-jp)", color: voiceExhausted ? "var(--color-accent-700)" : muted(55) }}>
                        {voiceExhausted
                          ? `本日の音声利用枠（1日${voiceQuota.limit}回）は使い切りました。`
                          : `本日の残り音声セッション：${voiceQuota.remaining} / ${voiceQuota.limit} 回`}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!voiceExhausted) patch({ voiceOn: !form.voiceOn }); }}
                    aria-pressed={form.voiceOn}
                    disabled={voiceExhausted}
                    style={{ all: "unset", cursor: voiceExhausted ? "not-allowed" : "pointer", opacity: voiceExhausted ? 0.4 : 1, width: 44, height: 26, borderRadius: 999, background: form.voiceOn ? "var(--color-accent-500)" : "var(--color-neutral-300)", position: "relative", flex: "none", transition: "background .15s ease" }}
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
                  面接はいつでも途中で中断できます。ただし中断すると、それまでの回答は保存されません。
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
