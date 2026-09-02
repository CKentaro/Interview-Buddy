"use client";

import { DependentSelectField } from "@/components/ui/DependentSelectField";
import {
  INDUSTRY_TAXONOMY,
  ROLE_TAXONOMY,
} from "@/domain/interview/model/careerTaxonomy";

/** 志望設定の 4 項目。面接設定フォームと同じ平坦な形にそろえてある。 */
export type CareerPreferenceValue = {
  industryMajor: string;
  industryMinor: string;
  jobMajor: string;
  jobMinor: string;
};

export const EMPTY_CAREER_PREFERENCE_VALUE: CareerPreferenceValue = {
  industryMajor: "",
  industryMinor: "",
  jobMajor: "",
  jobMinor: "",
};

// 分類マスタはドメイン側の単一の真実源を参照する（面接設定フォームと同じ集合）。
const INDUSTRY: Record<string, readonly string[]> = INDUSTRY_TAXONOMY;
const ROLE: Record<string, readonly string[]> = ROLE_TAXONOMY;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

/**
 * 志望業界・志望職種を選ぶ 4 つの select（オンボーディングとマイページで共用）。
 *
 * 小分類の枠は最初から出しておき、大分類を選ぶまでは薄く沈めて操作させない
 * （後から現れる項目は入力し忘れやすい）。大分類を変えたら小分類は空に戻す。
 * 大小がそろわない組み合わせはサーバー側で「未設定」に倒れるため、
 * 中途半端な値のまま保存されることはない。
 */
export function CareerPreferenceFields({
  value,
  onChange,
  disabled = false,
}: {
  value: CareerPreferenceValue;
  onChange: (next: CareerPreferenceValue) => void;
  disabled?: boolean;
}) {
  const patch = (p: Partial<CareerPreferenceValue>) =>
    onChange({ ...value, ...p });

  return (
    <>
      <Field label="志望業界（大分類）">
        <select
          className="input"
          value={value.industryMajor}
          disabled={disabled}
          onChange={(e) =>
            patch({ industryMajor: e.target.value, industryMinor: "" })
          }
        >
          <option value="">選択しない</option>
          {Object.keys(INDUSTRY).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <DependentSelectField
        label="志望業界（小分類）"
        value={value.industryMinor}
        options={INDUSTRY[value.industryMajor] ?? []}
        enabled={!!value.industryMajor}
        placeholder="選択しない"
        lockedMessage="先に志望業界の大分類を選んでください。"
        disabled={disabled}
        onChange={(v) => patch({ industryMinor: v })}
      />
      <Field label="志望職種（大分類）">
        <select
          className="input"
          value={value.jobMajor}
          disabled={disabled}
          onChange={(e) => patch({ jobMajor: e.target.value, jobMinor: "" })}
        >
          <option value="">選択しない</option>
          {Object.keys(ROLE).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <DependentSelectField
        label="志望職種（小分類）"
        value={value.jobMinor}
        options={ROLE[value.jobMajor] ?? []}
        enabled={!!value.jobMajor}
        placeholder="選択しない"
        lockedMessage="先に志望職種の大分類を選んでください。"
        disabled={disabled}
        onChange={(v) => patch({ jobMinor: v })}
      />
    </>
  );
}
