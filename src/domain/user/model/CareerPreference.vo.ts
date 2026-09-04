import {
  INDUSTRY_TAXONOMY,
  ROLE_TAXONOMY,
  type TaxonomyPair,
  toTaxonomyPair,
} from "@/domain/interview/model/careerTaxonomy";

/**
 * 志望設定（ユビキタス言語: CareerPreference）。
 *
 * ユーザーが「普段どの業界・職種を受けているか」を保持し、面接設定画面の
 * 初期入力に使う。オンボーディングはスキップできるので、両方 null は正常な状態。
 *
 * NOTE: 分類マスタは interview コンテキストの careerTaxonomy を参照する
 * （順応者。面接設定フォームと同じ集合でないと初期入力として使えないため、
 * 二重管理せず単一の真実源を共有する）。
 */
export type CareerPreference = {
  /** 志望業界（大分類 / 小分類）。未設定なら null。 */
  industry: TaxonomyPair | null;
  /** 志望職種（大分類 / 小分類）。未設定なら null。 */
  job: TaxonomyPair | null;
};

/** 何も設定していない状態。 */
export const EMPTY_CAREER_PREFERENCE: CareerPreference = {
  industry: null,
  job: null,
};

/** 平坦な 4 つの値（DB 列・DTO の形）を検証済みの志望設定に組み直す。 */
export function toCareerPreference(input: {
  industryMajor?: string | null;
  industryMinor?: string | null;
  jobMajor?: string | null;
  jobMinor?: string | null;
}): CareerPreference {
  return {
    // 大小がそろい、かつマスタに存在する組み合わせだけを採用する。
    // 片方だけ・マスタ外は「未設定」に倒す（面接設定へそのまま流し込めない値を残さない）。
    industry: toTaxonomyPair(
      INDUSTRY_TAXONOMY,
      input.industryMajor,
      input.industryMinor,
    ),
    job: toTaxonomyPair(ROLE_TAXONOMY, input.jobMajor, input.jobMinor),
  };
}
