"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { IconArrowRight, IconArrowLeft, IconCheck, IconPlay, IconCaret } from "@/components/ui/icons";

/* ============================================================
 * Static data
 * ============================================================ */
const INDUSTRY: Record<string, string[]> = {
  "メーカー・商社":      ["自動車", "電気・電子", "機械", "化学・素材", "食品・飲料", "医薬品・医療機器", "家具・インテリア", "衣料・アパレル", "総合商社", "専門商社"],
  "金融・保険":          ["銀行", "証券", "保険", "クレジットカード・信販", "リース", "資産運用・投資顧問"],
  "IT・インターネット":  ["SIer・システム開発", "Web・インターネットサービス", "ソフトウェア・SaaS", "通信・インフラ", "ハードウェア・半導体", "ゲーム", "セキュリティ", "AI・データ", "EC・広告"],
  "流通・小売・サービス":["百貨店", "スーパーマーケット", "コンビニエンスストア", "専門店（ファッション）", "専門店（電気・電子）", "通信販売・Eコマース", "ホテル・旅行", "飲食業", "理美容・エステ", "教育・研修"],
  "建築・不動産":        ["ゼネコン・建築", "ハウスメーカー", "設計・建築", "不動産開発", "不動産仲介・管理"],
  "メディカル":          ["病院・クリニック", "製薬会社", "医療機器メーカー", "看護・介護施設", "医療関連サービス"],
  "マスコミ・メディア":  ["新聞", "テレビ", "ラジオ", "出版", "広告代理店", "インターネットメディア"],
  "コンサルティング・士業":["経営コンサルティング", "ITコンサルティング", "人事コンサルティング", "弁護士", "公認会計士", "税理士"],
  "運輸・物流":          ["航空", "鉄道", "海運", "陸運・運送", "物流・倉庫"],
  "エネルギー":          ["電力", "ガス", "石油・石炭", "再生エネルギー"],
  "エンターテインメント":["ゲーム・アミューズメント", "映画・映像", "音楽・音響", "スポーツ"],
};
const INDUSTRY_LARGE = Object.keys(INDUSTRY);

const ROLE: Record<string, string[]> = {
  "技術系":        ["ソフトウェアエンジニア", "システムエンジニア", "ネットワークエンジニア", "クラウドエンジニア", "データベースエンジニア", "セキュリティエンジニア", "モバイルアプリ開発者", "Webエンジニア", "フルスタックエンジニア", "DevOpsエンジニア", "MLエンジニア", "データサイエンティスト", "組み込みエンジニア", "その他エンジニア"],
  "事務系":        ["総務", "人事", "経理", "財務", "法務", "広報", "経営企画", "マーケ", "営業企画"],
  "営業":          ["法人営業", "個人営業", "海外営業", "技術営業", "インサイドセールス", "カスタマーサクセス"],
  "クリエイティブ":["Webデザイナー", "グラフィックデザイナー", "UIデザイナー", "UXデザイナー", "イラストレーター", "ゲームデザイナー"],
  "コンサルティング":["経営コンサル", "ITコンサル", "人事コンサル", "財務コンサル"],
  "医療":          ["医師", "看護師", "薬剤師", "臨床検査技師", "理学療法士", "作業療法士"],
  "士業":          ["弁護士", "公認会計士", "税理士", "司法書士", "行政書士", "社会保険労務士", "弁理士"],
};
const ROLE_LARGE = Object.keys(ROLE);

const STAGES = [
  { id: "first",  label: "1次面接",  desc: "第一印象と経歴の確認が中心。" },
  { id: "second", label: "2次面接",  desc: "経験や価値観をやや深く掘り下げる場。" },
  { id: "final",  label: "最終面接", desc: "意思決定者との価値観のすり合わせ。" },
];

const VOICE_OPTIONS = [
  { id: "on",  label: "ON",  desc: "AI が質問を音声で読み上げます（TTS）。より本番に近い練習になります。" },
  { id: "off", label: "OFF", desc: "テキストのみで進めます。静かな場所でも気軽に練習できます。" },
];

const INTERVIEWERS = [
  { id: "friendly", label: "フレンドリー", desc: "和やかな雰囲気で進みます" },
  { id: "neutral",  label: "ニュートラル", desc: "一般的な面接の雰囲気です" },
  { id: "strict",   label: "厳しめ",       desc: "鋭い質問や深掘りが多めです" },
];

const STEP_LABELS = ["業界・企業", "職種", "選考設定", "確認"];

const SCREENS = [
  { id: "industry",  mainStep: 1 },
  { id: "company",   mainStep: 1 },
  { id: "role",      mainStep: 2 },
  { id: "selection", mainStep: 3 },
  { id: "confirm",   mainStep: 4 },
] as const;

type FormData = {
  industryLarge: string;
  industrySmall: string;
  company: string;
  roleLarge: string;
  roleSmall: string;
  stage: string;
  interviewer: string;
  voiceEnabled: boolean; // AI音声読み上げ (TTS) ON/OFF
};

/* ============================================================
 * Primitives
 * ============================================================ */
function ChoiceGrid({ options, value, onChange, cols = 3 }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: "18px 18px",
            background: on ? "var(--ink)" : "var(--bg-card)",
            color: on ? "var(--bg)" : "var(--ink)",
            border: "1px solid", borderColor: on ? "var(--ink)" : "var(--line)",
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            fontFamily: "var(--font-noto-jp), sans-serif",
            textAlign: "left", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 10, cursor: "pointer",
            minHeight: 64, transition: "all .15s ease",
          }}>
            <span style={{ lineHeight: 1.4 }}>{opt}</span>
            <span style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${on ? "var(--teal)" : "var(--line-strong)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {on && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--teal)", display: "inline-block" }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OptionCards({ options, value, onChange, cols = 3 }: {
  options: { id: string; label: string; desc: string }[];
  value: string;
  onChange: (v: string) => void;
  cols?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            textAlign: "left", padding: "18px 18px",
            background: on ? "var(--ink)" : "var(--bg-card)",
            color: on ? "var(--bg)" : "var(--ink)",
            border: "1px solid", borderColor: on ? "var(--ink)" : "var(--line)",
            borderRadius: 12, cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 8,
            transition: "all .15s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${on ? "var(--teal)" : "var(--line-strong)"}`, background: on ? "var(--ink)" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {on && <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--teal)", display: "inline-block" }} />}
              </span>
              {on && <IconCheck size={12} />}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-noto-jp), sans-serif", marginTop: 4 }}>{o.label}</div>
            <div style={{ fontSize: 12, lineHeight: 1.65, color: on ? "rgba(246,244,237,0.7)" : "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>{o.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function ContextChip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 999, fontSize: 12, fontFamily: "var(--font-noto-jp), sans-serif" }}>
          <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-4)", letterSpacing: 0.5 }}>{it.label.toUpperCase()}</span>
          <span style={{ color: "var(--ink-4)" }}>·</span>
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenCard({ children, padding = "32px 36px" }: { children: React.ReactNode; padding?: string }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, padding }}>
      {children}
    </div>
  );
}

function StepHeading({ kicker, title, hint, onSample }: { kicker: string; title: string; hint: string; onSample?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
      <div>
        <div className="mono" style={{ fontSize: 11, letterSpacing: 1.2, color: "var(--teal-deep)", marginBottom: 12 }}>— {kicker}</div>
        <h1 style={{ fontSize: 32, lineHeight: 1.35, letterSpacing: -0.5, fontWeight: 700, margin: 0, fontFamily: "var(--font-noto-jp), sans-serif" }}>{title}</h1>
        <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "10px 0 0", maxWidth: 540, fontFamily: "var(--font-noto-jp), sans-serif" }}>{hint}</p>
      </div>
      {onSample && (
        <button onClick={onSample} style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", paddingBottom: 1, cursor: "pointer", background: "none", border: "none", borderBottom: "1px dashed var(--line-strong)" }}>
          サンプル値を入れる
        </button>
      )}
    </div>
  );
}

/* ============================================================
 * Stepper
 * ============================================================ */
function Stepper({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 16, marginBottom: 32, overflow: "hidden" }}>
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const state = idx < step ? "done" : idx === step ? "active" : "future";
        return (
          <div key={label} style={{ display: "contents" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 999,
                background: state === "active" ? "var(--ink)" : state === "done" ? "var(--teal)" : "transparent",
                border: state === "future" ? "1.5px dashed var(--line-strong)" : "none",
                color: state === "future" ? "var(--ink-4)" : "white",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, fontFamily: "var(--font-jetbrains), monospace",
                transition: "all .2s ease",
              }}>
                {state === "done" ? <IconCheck size={11} /> : String(idx).padStart(2, "0")}
              </span>
              <div>
                <div className="mono" style={{ fontSize: 9.5, letterSpacing: 0.8, color: state === "future" ? "var(--ink-4)" : state === "done" ? "var(--teal-deep)" : "var(--ink)" }}>
                  STEP {String(idx).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 13, fontWeight: state === "active" ? 700 : 500, color: state === "future" ? "var(--ink-4)" : "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.3, whiteSpace: "nowrap" }}>
                  {label}
                </div>
              </div>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ flex: 1, height: 1, minWidth: 12, background: idx < step ? "var(--teal)" : "var(--line)", opacity: idx < step ? 1 : 0.7 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * Screen components
 * ============================================================ */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function ScreenIndustry({ data, setData, onSample }: { data: FormData; setData: (d: FormData) => void; onSample: () => void }) {
  const subs = data.industryLarge ? (INDUSTRY[data.industryLarge] ?? []) : [];
  return (
    <div>
      <StepHeading kicker="STEP 01 · 業界 (1 / 2)" title="志望業界を選んでください。" hint="大分類を選ぶと、対応する業種が下に表示されます。それぞれ1つずつ選びましょう。" onSample={onSample} />
      <ScreenCard>
        <FieldLabel>業界・大分類</FieldLabel>
        <ChoiceGrid options={INDUSTRY_LARGE} value={data.industryLarge} onChange={(v) => setData({ ...data, industryLarge: v, industrySmall: data.industryLarge === v ? data.industrySmall : "" })} cols={4} />
        {data.industryLarge && (
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <FieldLabel>業種・小分類（{data.industryLarge}）</FieldLabel>
            <ChoiceGrid options={subs} value={data.industrySmall} onChange={(v) => setData({ ...data, industrySmall: v })} cols={3} />
          </div>
        )}
      </ScreenCard>
    </div>
  );
}

function ScreenCompany({ data, setData }: { data: FormData; setData: (d: FormData) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <StepHeading kicker="STEP 01 · 企業 (2 / 2)" title="志望企業の名前を教えてください。" hint="正式名称が分かれば略称でも構いません。" />
      <ContextChip items={[{ label: "業界", value: `${data.industryLarge} / ${data.industrySmall}` }]} />
      <ScreenCard padding="40px 44px">
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 8 }}>COMPANY NAME</div>
        <input
          type="text" value={data.company}
          onChange={(e) => setData({ ...data, company: e.target.value })}
          placeholder="例：Boston Consulting Group"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "10px 0 12px",
            background: "transparent", border: "none",
            borderBottom: `2px solid ${focused ? "var(--ink)" : "var(--line-strong)"}`,
            fontSize: 17, fontWeight: 500, color: "var(--ink)",
            fontFamily: "var(--font-noto-jp), sans-serif",
            transition: "border-color .15s ease", outline: "none",
          }}
        />
      </ScreenCard>
    </div>
  );
}

function ScreenRole({ data, setData }: { data: FormData; setData: (d: FormData) => void }) {
  const subs = data.roleLarge ? (ROLE[data.roleLarge] ?? []) : [];
  return (
    <div>
      <StepHeading kicker="STEP 02 · 職種" title="志望する職種を選んでください。" hint="大分類を選ぶと、対応する職種が下に表示されます。AI が職種特有の論点を準備します。" />
      <ScreenCard>
        <FieldLabel>職種・大分類</FieldLabel>
        <ChoiceGrid options={ROLE_LARGE} value={data.roleLarge} onChange={(v) => setData({ ...data, roleLarge: v, roleSmall: data.roleLarge === v ? data.roleSmall : "" })} cols={4} />
        {data.roleLarge && (
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <FieldLabel>職種・小分類（{data.roleLarge}）</FieldLabel>
            <ChoiceGrid options={subs} value={data.roleSmall} onChange={(v) => setData({ ...data, roleSmall: v })} cols={3} />
          </div>
        )}
      </ScreenCard>
    </div>
  );
}

function ScreenSelection({ data, setData }: { data: FormData; setData: (d: FormData) => void }) {
  const sectionLabel = (num: string, title: string, desc: string) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)" }}>{num}</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-noto-jp), sans-serif" }}>{desc}</div>
      </div>
    </div>
  );
  return (
    <div>
      <StepHeading kicker="STEP 03 · SELECTION SETUP" title="選考の状況と、雰囲気を選んでください。" hint="同じ企業でも、選考フェーズや面接官のトーンで質問の角度が大きく変わります。" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 36 }}>
        <div>
          {sectionLabel("01", "選考状況", "今回の練習で想定するフェーズを1つ選択してください。")}
          <OptionCards options={STAGES} value={data.stage} onChange={(v) => setData({ ...data, stage: v })} cols={3} />
        </div>
        <div>
          {sectionLabel("02", "面接官タイプ", "AI が再現するトーンです。慣れてきたら厳しめも試してみてください。")}
          <OptionCards options={INTERVIEWERS} value={data.interviewer} onChange={(v) => setData({ ...data, interviewer: v })} cols={3} />
        </div>
        <div>
          {sectionLabel("03", "AI音声", "質問をAIが読み上げるかどうかを設定します。TTSの利用有無を切り替えられます。")}
          <OptionCards
            options={VOICE_OPTIONS}
            value={data.voiceEnabled ? "on" : "off"}
            onChange={(v) => setData({ ...data, voiceEnabled: v === "on" })}
            cols={2}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ num, label, value, caption, last }: { num: string; label: string; value: string; caption?: string; last?: boolean }) {
  return (
    <div style={{ padding: "20px 36px", borderBottom: last ? "none" : "1px solid var(--line)", display: "grid", gridTemplateColumns: "200px 1fr", gap: 48, alignItems: "start" }}>
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: 1, color: "var(--ink-4)", marginBottom: 6 }}>{num}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>{label}</div>
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-noto-jp), sans-serif", lineHeight: 1.4 }}>{value}</div>
        {caption && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--font-noto-jp), sans-serif" }}>{caption}</div>}
      </div>
    </div>
  );
}

function ScreenConfirm({ data }: { data: FormData }) {
  const stage = STAGES.find((s) => s.id === data.stage);
  const iv = INTERVIEWERS.find((s) => s.id === data.interviewer);
  return (
    <div>
      <StepHeading kicker="STEP 04 · REVIEW" title="入力内容を確認" hint="AI はこの情報をもとに、最初の質問とその後の深掘りを設計します。" />
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "20px 36px", background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--teal)", marginBottom: 6 }}>SESSION CONFIG</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-noto-jp), sans-serif" }}>
              {data.company}
              <span style={{ fontSize: 13, color: "rgba(246,244,237,0.6)", marginLeft: 10, fontWeight: 400 }}>· {data.roleLarge} / {data.roleSmall}</span>
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(246,244,237,0.10)", border: "1px solid rgba(246,244,237,0.16)", borderRadius: 999, fontSize: 12, fontFamily: "var(--font-noto-jp), sans-serif" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--teal)" }} />
            開始準備OK
          </div>
        </div>
        <SummaryRow num="01" label="志望業界" value={`${data.industryLarge} / ${data.industrySmall}`} />
        <SummaryRow num="02" label="企業名" value={data.company} />
        <SummaryRow num="03" label="志望職種" value={`${data.roleLarge} / ${data.roleSmall}`} />
        <SummaryRow num="04" label="選考状況" value={stage?.label ?? ""} caption={stage?.desc} />
        <SummaryRow num="05" label="面接官タイプ" value={iv?.label ?? ""} caption={iv?.desc} />
        <SummaryRow num="06" label="AI音声（TTS）" value={data.voiceEnabled ? "ON" : "OFF"} caption={data.voiceEnabled ? "質問を音声で読み上げます" : "テキストのみで進めます"} last />
      </div>
      <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--teal-soft)", border: "1px solid color-mix(in oklch, var(--teal) 30%, transparent)", borderRadius: 12, display: "flex", gap: 12 }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, background: "var(--teal-deep)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginTop: 1 }}>i</span>
        <div style={{ fontSize: 12.5, lineHeight: 1.75, color: "var(--ink-2)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
          面接は途中で中断・再開できます。<strong style={{ fontWeight: 700, color: "var(--ink)" }}>静かな場所</strong>を確保し、可能なら声に出して回答することをおすすめします。
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Footer actions
 * ============================================================ */
function FooterActions({ idx, valid, onBack, onNext, onStart, starting = false }: {
  idx: number; valid: boolean; starting?: boolean;
  onBack: () => void; onNext: () => void; onStart: () => void;
}) {
  const isFirst = idx === 0;
  const isConfirm = idx === SCREENS.length - 1;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, flexWrap: "wrap", gap: 12 }}>
      {isFirst ? (
        <Link href="/home" style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <IconArrowLeft size={12} />キャンセル
        </Link>
      ) : (
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", background: "transparent", color: "var(--ink)", border: "1px solid var(--line-strong)", borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: "pointer" }}>
          <IconArrowLeft size={12} />{isConfirm ? "修正する" : "戻る"}
        </button>
      )}

      {isConfirm ? (
        <button onClick={onStart} disabled={starting} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 28px", background: starting ? "var(--ink-3)" : "var(--ink)", color: "var(--bg)", borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: "var(--font-noto-jp), sans-serif", boxShadow: "0 8px 24px -8px rgba(11,23,51,0.25)", cursor: starting ? "wait" : "pointer", border: "none" }}>
          {starting ? (
            <><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 999, border: "2px solid rgba(246,244,237,0.4)", borderTopColor: "var(--bg)", animation: "spin .8s linear infinite" }} />準備中…</>
          ) : (
            <><IconPlay size={12} />面接練習を開始する<IconArrowRight size={13} /></>
          )}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <button disabled={!valid} onClick={onNext} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 26px", background: valid ? "var(--ink)" : "var(--line-strong)", color: valid ? "var(--bg)" : "var(--ink-4)", borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: "var(--font-noto-jp), sans-serif", cursor: valid ? "pointer" : "not-allowed", border: "none", transition: "background .2s ease" }}>
            次へ<IconArrowRight size={13} />
          </button>
          {!valid && <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif" }}>選択すると次へ進めます。</div>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Page
 * ============================================================ */
export default function SetupPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [data, setData] = useState<FormData>({
    industryLarge: "", industrySmall: "", company: "",
    roleLarge: "", roleSmall: "",
    stage: "", interviewer: "", voiceEnabled: false,
  });

  const cur = SCREENS[idx]!;

  const valid = [
    !!(data.industryLarge && data.industrySmall),
    !!data.company.trim(),
    !!(data.roleLarge && data.roleSmall),
    !!(data.stage && data.interviewer), // voiceEnabled is boolean, always set
    true,
  ][idx] ?? false;

  const go = (n: number) => { window.scrollTo({ top: 0, behavior: "smooth" }); setIdx(n); };

  const handleStart = async () => {
    setStarting(true);
    setStartError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.company,
          industryMajor: data.industryLarge,
          industryMinor: data.industrySmall,
          jobMajor: data.roleLarge,
          jobMinor: data.roleSmall,
          selectionStage: data.stage,
          interviewerType: data.interviewer,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const session = await res.json() as import("@/types/api").SessionResponse;
      // Store initial question so live page can start without an extra fetch
      sessionStorage.setItem("ib-session", JSON.stringify({
        sessionId: session.sessionId,
        voiceEnabled: data.voiceEnabled,
        question: session.firstQuestion,
        questionNumber: 1,
      }));
      router.push(`/interview/${session.sessionId}/live`);
    } catch (e) {
      console.error(e);
      setStartError("セッションの開始に失敗しました。もう一度お試しください。");
      setStarting(false);
    }
  };

  const fillSample = () => setData({
    industryLarge: "コンサルティング・士業", industrySmall: "経営コンサルティング",
    company: "Boston Consulting Group",
    roleLarge: "コンサルティング", roleSmall: "経営コンサル",
    stage: "second", interviewer: "neutral", voiceEnabled: true,
  });

  return (
    <>
      <AppTopBar
        left={
          <div className="mono" style={{ fontSize: 11, letterSpacing: 0.6, color: "var(--ink-3)" }}>
            <Link href="/home" style={{ color: "var(--ink-3)" }}>HOME</Link>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>SETUP</span>
            <span style={{ margin: "0 10px", color: "var(--ink-4)" }}>/</span>
            <span>STEP {String(cur.mainStep).padStart(2, "0")} · {STEP_LABELS[cur.mainStep - 1]?.toUpperCase()}</span>
          </div>
        }
        right={
          <Link href="/home" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-noto-jp), sans-serif", textDecoration: "none" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            中断してHOMEへ戻る
          </Link>
        }
      />

      <div style={{ padding: "40px 48px 80px", maxWidth: 1080, margin: "0 auto" }}>
        <Stepper step={cur.mainStep} />
        {idx === 0 && <ScreenIndustry data={data} setData={setData} onSample={fillSample} />}
        {idx === 1 && <ScreenCompany data={data} setData={setData} />}
        {idx === 2 && <ScreenRole data={data} setData={setData} />}
        {idx === 3 && <ScreenSelection data={data} setData={setData} />}
        {idx === 4 && <ScreenConfirm data={data} />}
        {startError && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--warn-bg)", border: "1px solid var(--warn-line)", borderRadius: 10, fontSize: 13, color: "var(--warn)", fontFamily: "var(--font-noto-jp), sans-serif" }}>
            {startError}
          </div>
        )}
        <FooterActions
          idx={idx}
          valid={valid && !starting}
          onBack={() => go(idx - 1)}
          onNext={() => go(idx + 1)}
          onStart={handleStart}
          starting={starting}
        />
      </div>
    </>
  );
}
