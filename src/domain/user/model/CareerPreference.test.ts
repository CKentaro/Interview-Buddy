import { describe, expect, it } from "vitest";

import { toCareerPreference } from "./CareerPreference.vo";

describe("toCareerPreference", () => {
  it("マスタに存在する組み合わせ → 組にして返す", () => {
    expect(
      toCareerPreference({
        industryMajor: "IT・インターネット",
        industryMinor: "ソフトウェア・SaaS",
        jobMajor: "技術系",
        jobMinor: "Webエンジニア",
      }),
    ).toEqual({
      industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
      job: { major: "技術系", minor: "Webエンジニア" },
    });
  });

  it("大分類だけ／小分類だけ → 未設定に倒す", () => {
    expect(
      toCareerPreference({
        industryMajor: "IT・インターネット",
        jobMinor: "Webエンジニア",
      }),
    ).toEqual({ industry: null, job: null });
  });

  it("マスタに無い組み合わせ → 未設定に倒す", () => {
    expect(
      toCareerPreference({
        industryMajor: "金融・保険",
        industryMinor: "ゲーム", // IT 側の小分類
        jobMajor: "技術系",
        jobMinor: "存在しない職種",
      }),
    ).toEqual({ industry: null, job: null });
  });

  it("空文字・null・未指定 → 未設定", () => {
    expect(
      toCareerPreference({ industryMajor: "", industryMinor: null }),
    ).toEqual({ industry: null, job: null });
  });

  it("業界だけ設定 → 職種は null のまま業界を返す", () => {
    expect(
      toCareerPreference({
        industryMajor: "メーカー・商社",
        industryMinor: "自動車",
      }),
    ).toEqual({
      industry: { major: "メーカー・商社", minor: "自動車" },
      job: null,
    });
  });
});
