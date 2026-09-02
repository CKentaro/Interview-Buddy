"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LcArrowLeft, LcAlert } from "@/components/ui/icons";
import { INTERVIEWER_TYPE_LABEL } from "@/domain/interview/model/InterviewerType.vo";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import {
  INDUSTRY_TAXONOMY,
  ROLE_TAXONOMY,
} from "@/domain/interview/model/careerTaxonomy";
import type {
  AnalyzeJobPostingResponse,
  JobPostingFailureReason,
  JobPostingPageKindResponse,
  SessionResponse,
  VoiceUsageResponse,
} from "@/app/api/types";

// 分類マスタはドメイン側の単一の真実源を参照する（求人票の抽出でも同じ集合を使う）。
const INDUSTRY: Record<string, readonly string[]> = INDUSTRY_TAXONOMY;
const ROLE: Record<string, readonly string[]> = ROLE_TAXONOMY;


/* ── Static data ── */
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
const INTERVIEW_LENGTH_OPTIONS = [
  { key: InterviewLength.SHORT, label: "短め・全8問", desc: "4つの観点をコンパクトに練習します。" },
  { key: InterviewLength.STANDARD, label: "普通・全12問", desc: "4つの観点をそれぞれ深く練習します。" },
  { key: InterviewLength.LONG, label: "長め・全18問", desc: "再現性と価値観を2つの大問で練習します。" },
] as const;
/** 解析に失敗した理由ごとの案内文。いずれの場合も手入力で先へ進める。 */
const FAILURE_MESSAGE: Record<JobPostingFailureReason, string> = {
  INVALID_URL: "URL の形式が正しくないか、指定できないアドレスです。",
  UNREACHABLE: "ページに接続できませんでした。サイト側が自動での読み込みを許可していない場合があります。",
  UNSUPPORTED_CONTENT: "HTML ページではないため読み込めませんでした。",
  EMPTY_CONTENT: "ページの本文を取得できませんでした。ログインが必要なページの可能性があります。",
  EXTRACTION_FAILED: "ページの解析に失敗しました。時間をおいて試すか、そのまま手入力で進めてください。",
};

/** 読み取れたページ種別ごとの補足。何がどこまで埋まったかを利用者に伝える。 */
const PAGE_KIND_MESSAGE: Record<JobPostingPageKindResponse, string> = {
  SINGLE_JOB_POSTING: "求人票として読み取りました。",
  JOB_LIST: "求人一覧ページのようです。個別の求人ページの URL だと、より詳しく読み取れます。",
  COMPANY_RECRUIT_PAGE: "企業の採用ページとして読み取りました。職種は個別の求人ページか、手入力で指定してください。",
  ERROR_OR_LOGIN: "求人の内容を読み取れませんでした。ログインが必要なページの可能性があります。",
  OTHER: "求人ページとして読み取れませんでした。",
};

const STEP_TITLES = ["志望業界", "志望企業・職種", "選考フェーズ", "面接の雰囲気", "確認"];
const STEP_TOTAL = STEP_TITLES.length;
/** 確認ステップの添字。編集から戻る先。 */
const CONFIRM_STEP = STEP_TOTAL - 1;

type FormData = {
  industryMajor: string; industryMinor: string;
  companyName: string; roleMajor: string; roleMinor: string;
  phase: string; interviewerType: string; voiceOn: boolean;
  interviewLength: InterviewLength;
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
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{desc}</div>
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
  const [jobUrl, setJobUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  /** 解析結果。null は未解析。failed も保持して理由を表示する。 */
  const [analysis, setAnalysis] = useState<AnalyzeJobPostingResponse | null>(null);
  const [useGeneratedQuestions, setUseGeneratedQuestions] = useState(false);
  /**
   * 確認ステップの「編集」から来ているか。
   * true の間は、そのステップを終えると残りのステップを辿らず確認へ直接戻る。
   */
  const [editingFromConfirm, setEditingFromConfirm] = useState(false);
  const [form, setForm] = useState<FormData>({
    industryMajor: "", industryMinor: "", companyName: "",
    roleMajor: "", roleMinor: "", phase: "", interviewerType: "", voiceOn: false,
    interviewLength: InterviewLength.STANDARD,
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
  const analyzed = analysis?.status === "analyzed" ? analysis : null;
  /** 求人由来の質問生成を選べるか（解析済みかつ材料が十分なときだけ）。 */
  const canGenerateQuestions = analyzed?.usableAsContext === true;

  /**
   * 求人ページを解析し、埋められた項目だけフォームへ反映する。
   * 抽出できなかった項目は既存の入力値を残し、ユーザーが手で埋める。
   */
  const analyzeJobUrl = async () => {
    const url = jobUrl.trim();
    if (url === "" || analyzing) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/job-postings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const result = (await res.json()) as AnalyzeJobPostingResponse;
      setAnalysis(result);
      if (result.status === "analyzed") {
        setForm((f) => ({
          ...f,
          companyName: result.companyName ?? f.companyName,
          // 業界・職種は大小がそろって初めてフォームの選択として成立する。
          ...(result.industryMajor && result.industryMinor
            ? { industryMajor: result.industryMajor, industryMinor: result.industryMinor }
            : {}),
          ...(result.jobMajor && result.jobMinor
            ? { roleMajor: result.jobMajor, roleMinor: result.jobMinor }
            : {}),
        }));
        setUseGeneratedQuestions(result.usableAsContext);
      } else {
        setUseGeneratedQuestions(false);
      }
    } catch (e) {
      console.error(e);
      setAnalysis({ status: "failed", reason: "EXTRACTION_FAILED" });
      setUseGeneratedQuestions(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const patch = (p: Partial<FormData>) => { setForm((f) => ({ ...f, ...p })); setShowHint(false); };

  const isStepValid = (s: number): boolean => {
    // 求人 URL の読み込みは任意。読み込めなくても手入力で先へ進める。
    if (s === 0) return !!form.industryMajor && !!form.industryMinor;
    if (s === 1) return !!form.companyName.trim() && !!form.roleMajor && !!form.roleMinor;
    if (s === 2) return !!form.phase;
    if (s === 3) return !!form.interviewerType;
    return true;
  };

  const goBack = () => { setStep((s) => Math.max(0, s - 1)); setShowHint(false); };
  const goNext = () => {
    if (!isStepValid(step)) { setShowHint(true); return; }
    setStep((s) => Math.min(CONFIRM_STEP, s + 1)); setShowHint(false);
  };

  /** 確認ステップの「編集」。そのステップへ移動し、完了後は確認へ直接戻す。 */
  const startEditing = (target: number) => {
    setEditingFromConfirm(true);
    setStep(target);
    setShowHint(false);
  };

  /** 編集を終えて確認ステップへ戻る。未入力があればその場で知らせる。 */
  const finishEditing = () => {
    if (!isStepValid(step)) { setShowHint(true); return; }
    setEditingFromConfirm(false);
    setStep(CONFIRM_STEP);
    setShowHint(false);
  };

  const fillSample = () => setForm({
    industryMajor: "IT・インターネット", industryMinor: "Web・インターネットサービス",
    companyName: "株式会社interview buddy", roleMajor: "技術系", roleMinor: "Webエンジニア",
    phase: "second", interviewerType: "neutral", voiceOn: false,
    interviewLength: InterviewLength.STANDARD,
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
          interviewLength: form.interviewLength,
          ...(analyzed ? { jobPosting: analyzed } : {}),
          generateQuestionsFromJobPosting: canGenerateQuestions && useGeneratedQuestions,
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
        totalQuestionCount: session.totalQuestionCount,
        interviewLength: session.interviewLength,
        interviewerType: form.interviewerType,
        // 音声を要求したのに枠超過で無効化された場合のみ、ライブ画面で通知する。
        voiceLimited: form.voiceOn && !session.voiceEnabled,
        // 生成を要求したのに失敗してバンク出題に落ちた場合のみ、ライブ画面で通知する。
        questionsFellBackToBank:
          canGenerateQuestions && useGeneratedQuestions && !session.questionsGeneratedFromJobPosting,
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
  const lengthLabel = INTERVIEW_LENGTH_OPTIONS.find(
    (option) => option.key === form.interviewLength,
  )?.label ?? "普通・全12問";
  const summary = [
    { label: "志望業界", value: form.industryMajor ? `${form.industryMajor} ／ ${form.industryMinor}` : "未設定", goto: 0 },
    { label: "志望企業・職種", value: `${form.companyName || "未設定"}${form.roleMajor ? `　・　${form.roleMajor} ／ ${form.roleMinor}` : ""}`, goto: 1 },
    { label: "選考フェーズ", value: phaseLabel, goto: 2 },
    { label: "面接の長さ", value: lengthLabel, goto: 3 },
    { label: "面接官タイプ・音声", value: `${typeLabel}　・　音声${form.voiceOn ? "あり" : "なし"}`, goto: 3 },
  ];

  return (
    <main className="ib-setup-main">
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
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)" }}>
                {editingFromConfirm ? "内容を編集しています" : `ステップ ${step + 1} / ${STEP_TOTAL}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{STEP_TITLES[step]}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {STEP_TITLES.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 999,
                  background: i <= step ? "var(--color-accent)" : "var(--color-neutral-300)",
                }} />
              ))}
            </div>
          </div>

          {/* 求人 URL からの自動入力（任意）と、その下の手入力は別のカードに分ける。 */}
          {step === 0 && (
            <div className="card ib-section ib-setup-card">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500 }}>求人ページの URL から自動入力する</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.7 }}>
                    求人票や企業の採用ページの URL を読み込むと、企業名・業界・職種を自動で入力します。
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com/jobs/123"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void analyzeJobUrl(); } }}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void analyzeJobUrl()}
                    disabled={analyzing || jobUrl.trim() === ""}
                    style={{ flex: "none", gap: 8 }}
                  >
                    {analyzing ? (
                      <>
                        <span style={{ width: 13, height: 13, border: "2px solid var(--color-neutral-300)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "ib-spin .8s linear infinite" }} />
                        <span>読み込み中</span>
                      </>
                    ) : (
                      <span>読み込む</span>
                    )}
                  </button>
                </div>

                {analysis?.status === "failed" && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-line)" }}>
                    <span style={{ flex: "none", marginTop: 2, color: "var(--color-danger)" }}><LcAlert size={16} /></span>
                    <div style={{ fontSize: 12.5, color: "var(--color-danger)", lineHeight: 1.7 }}>
                      {FAILURE_MESSAGE[analysis.reason]}
                    </div>
                  </div>
                )}

                {analyzed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
                      {PAGE_KIND_MESSAGE[analyzed.pageKind]}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        { label: "企業名", value: analyzed.companyName },
                        { label: "業界", value: analyzed.industryMajor && analyzed.industryMinor ? `${analyzed.industryMajor} ／ ${analyzed.industryMinor}` : null },
                        { label: "職種", value: analyzed.jobMajor && analyzed.jobMinor ? `${analyzed.jobMajor} ／ ${analyzed.jobMinor}` : null },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", gap: 12, fontSize: 12.5 }}>
                          <span style={{ flex: "none", width: 48, color: "var(--ink-3)" }}>{row.label}</span>
                          <span style={{ color: row.value ? "var(--color-text)" : "var(--ink-3)" }}>
                            {row.value ?? "読み取れませんでした（手入力してください）"}
                          </span>
                        </div>
                      ))}
                    </div>
                </div>
                )}
              </div>
            </div>
          )}

          {step === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
              <span style={{ flex: "none", fontSize: 12, color: "var(--ink-3)" }}>手動で入力する</span>
              <div style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
            </div>
          )}

          <div className="card ib-section ib-setup-card" key={step}>
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>志望業界を教えてください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>大まかな分野から、当てはまるものを選んでください。</p>
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
                  <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>志望企業と職種を教えてください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>企業名は自由に入力できます。</p>
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
                  <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>選考フェーズを選んでください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>フェーズによって、面接の性格が変わります。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {PHASES.map((p) => <Choice key={p.key} label={p.label} desc={p.desc} active={form.phase === p.key} onSelect={() => patch({ phase: p.key })} />)}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>面接の雰囲気を選んでください</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>AI がこのトーンを再現します。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {INTERVIEWERS.map((t) => <Choice key={t.key} label={t.label} desc={t.desc} active={form.interviewerType === t.key} onSelect={() => patch({ interviewerType: t.key })} />)}
                </div>
                <div className="hr" style={{ margin: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: "var(--font-jp)" }}>面接の長さ</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>普通は4つの大問をそれぞれ2回深掘りします。</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {INTERVIEW_LENGTH_OPTIONS.map((option) => (
                      <Choice
                        key={option.key}
                        label={option.label}
                        desc={option.desc}
                        active={form.interviewLength === option.key}
                        onSelect={() => patch({ interviewLength: option.key })}
                      />
                    ))}
                  </div>
                </div>
                <div className="hr" style={{ margin: 0 }} />
                <div className="ib-split">
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 500 }}>AI の音声で質問を読み上げる</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>オフにすると、テキストのみで進行します。</div>
                    {voiceQuota !== null && (
                      <div style={{ marginTop: 4, fontSize: 12, color: voiceExhausted ? "var(--ink-3)" : "var(--ink-3)" }}>
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
                    style={{ all: "unset", cursor: voiceExhausted ? "not-allowed" : "pointer", opacity: voiceExhausted ? 0.4 : 1, width: 44, height: 26, borderRadius: 999, background: form.voiceOn ? "var(--color-accent)" : "var(--color-neutral-300)", position: "relative", flex: "none", transition: "background .15s ease" }}
                  >
                    <span style={{ position: "absolute", top: 2, left: form.voiceOn ? 20 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-knob)", transition: "left .15s ease" }} />
                  </button>
                </div>
                {/* 求人 URL を読み込めたときだけ、出題方法の選択肢を出す。 */}
                {canGenerateQuestions && (
                  <>
                    <div className="hr" style={{ margin: 0 }} />
                    <div className="ib-split">
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 500 }}>読み込んだ求人の内容から質問をつくる</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.7 }}>
                          オフにすると、質問バンクから出題します。評価の4軸と質問数は、どちらでも変わりません。
                        </div>
                        {analyzed?.companyName && (
                          <div style={{ marginTop: 4, fontSize: 12, color: "var(--ink-3)" }}>
                            読み込み済み：{analyzed.companyName}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseGeneratedQuestions((v) => !v)}
                        aria-pressed={useGeneratedQuestions}
                        style={{ all: "unset", cursor: "pointer", width: 44, height: 26, borderRadius: 999, background: useGeneratedQuestions ? "var(--color-accent)" : "var(--color-neutral-300)", position: "relative", flex: "none", transition: "background .15s ease" }}
                      >
                        <span style={{ position: "absolute", top: 2, left: useGeneratedQuestions ? 20 : 2, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "var(--shadow-knob)", transition: "left .15s ease" }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>内容を確認しましょう</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>この内容で、面接練習を準備します。</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {summary.map((row, i) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: i < summary.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
                      {/* minWidth: 0 が無いと、値が長いときに左側が縮まず「編集」が
                          1 文字幅まで潰れて縦書きのように見える。 */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{row.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{row.value}</div>
                      </div>
                      <button className="btn btn-ghost" onClick={() => startEditing(row.goto)} style={{ flex: "none", fontSize: 12 }}>編集</button>
                    </div>
                  ))}
                </div>
                <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)" }}>
                  面接はいつでも途中で中断できます。送信済みの回答は保存され、HOME画面から後で再開できます。
                </div>
                {startError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-line)" }}>
                    <span style={{ flex: "none", marginTop: 2, color: "var(--color-danger)" }}><LcAlert size={16} /></span>
                    <div style={{ fontSize: 12.5, color: "var(--color-danger)", lineHeight: 1.7 }}>面接の準備を開始できませんでした。通信状況をご確認のうえ、もう一度お試しください。</div>
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
          {step < CONFIRM_STEP && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              {/* 編集中は残りのステップを辿らせないため、戻る導線を出さない。 */}
              <button
                className="btn btn-secondary"
                onClick={goBack}
                disabled={step === 0 || editingFromConfirm}
                style={step === 0 || editingFromConfirm ? { opacity: 0, pointerEvents: "none" } : undefined}
              >
                戻る
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {showHint && <span style={{ fontSize: 12, color: "var(--color-danger)" }}>すべての項目を選択してください</span>}
                {editingFromConfirm ? (
                  <button className="btn btn-primary" onClick={finishEditing}>編集を完了して確認に戻る</button>
                ) : (
                  <button className="btn btn-primary" onClick={goNext}>次へ</button>
                )}
              </div>
            </div>
          )}
        </div>
    </main>
  );
}
