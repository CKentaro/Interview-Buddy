import { describe, expect, it } from "vitest";

import {
  INDUSTRY_TAXONOMY,
  ROLE_TAXONOMY,
  parseTaxonomyPair,
  toTaxonomyPair,
  toTaxonomyPairStrings,
} from "./careerTaxonomy";

describe("toTaxonomyPairStrings", () => {
  it("大分類と小分類を 1 文字列へ平坦化する", () => {
    const pairs = toTaxonomyPairStrings(INDUSTRY_TAXONOMY);

    expect(pairs).toContain("IT・インターネット/ソフトウェア・SaaS");
    expect(pairs).toHaveLength(
      Object.values(INDUSTRY_TAXONOMY).reduce((sum, minors) => sum + minors.length, 0),
    );
  });

  it("平坦化した全ての組は、そのまま組へ戻せる", () => {
    for (const taxonomy of [INDUSTRY_TAXONOMY, ROLE_TAXONOMY]) {
      for (const value of toTaxonomyPairStrings(taxonomy)) {
        expect(parseTaxonomyPair(taxonomy, value)).not.toBeNull();
      }
    }
  });
});

describe("parseTaxonomyPair", () => {
  it("マスタに存在する組を返す", () => {
    expect(parseTaxonomyPair(ROLE_TAXONOMY, "技術系/Webエンジニア")).toEqual({
      major: "技術系",
      minor: "Webエンジニア",
    });
  });

  // LLM が候補外を返したときの最後の防御。ここが緩むとフォームの選択肢に
  // 存在しない値が入る。
  it.each([
    ["金融・保険/ゲーム", "マスタに無い組み合わせ"],
    ["IT・インターネット", "小分類が無い"],
    ["存在しない業界/存在しない小分類", "どちらも無い"],
    ["", "空文字"],
    ["/", "区切りだけ"],
  ])("%s は null（%s）", (value) => {
    expect(parseTaxonomyPair(INDUSTRY_TAXONOMY, value)).toBeNull();
  });

  it.each([null, undefined])("%s は null", (value) => {
    expect(parseTaxonomyPair(INDUSTRY_TAXONOMY, value)).toBeNull();
  });

  it("小分類に区切り文字が含まれても最初の区切りで分割する", () => {
    const taxonomy = { 大分類: ["a/b"] };

    expect(parseTaxonomyPair(taxonomy, "大分類/a/b")).toEqual({
      major: "大分類",
      minor: "a/b",
    });
  });
});

describe("toTaxonomyPair", () => {
  it("マスタに存在する 2 値 → 組にして返す", () => {
    expect(
      toTaxonomyPair(ROLE_TAXONOMY, "技術系", "Webエンジニア"),
    ).toEqual({ major: "技術系", minor: "Webエンジニア" });
  });

  it.each([
    ["金融・保険", "ゲーム", "他の大分類の小分類"],
    ["存在しない業界", "銀行", "大分類が無い"],
    ["金融・保険", "", "小分類が空"],
    ["", "銀行", "大分類が空"],
  ])("(%s, %s) は null（%s）", (major, minor) => {
    expect(toTaxonomyPair(INDUSTRY_TAXONOMY, major, minor)).toBeNull();
  });

  it.each([null, undefined])("%s は null", (value) => {
    expect(toTaxonomyPair(INDUSTRY_TAXONOMY, value, "銀行")).toBeNull();
    expect(toTaxonomyPair(INDUSTRY_TAXONOMY, "金融・保険", value)).toBeNull();
  });
});
