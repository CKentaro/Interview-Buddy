import { describe, expect, it } from "vitest";

import { normalizeCompanyName } from "./normalizeCompanyName";

describe("normalizeCompanyName", () => {
  it("法人格の表記が前後どちらにあっても同じキーになる", () => {
    const expected = normalizeCompanyName("トヨタ自動車");

    expect(normalizeCompanyName("トヨタ自動車株式会社")).toBe(expected);
    expect(normalizeCompanyName("株式会社トヨタ自動車")).toBe(expected);
    expect(normalizeCompanyName("トヨタ自動車(株)")).toBe(expected);
    expect(normalizeCompanyName("トヨタ自動車㈱")).toBe(expected);
  });

  it("全角・半角と大文字小文字の違いを吸収する", () => {
    expect(normalizeCompanyName("ＫＤＤＩ株式会社")).toBe(normalizeCompanyName("kddi"));
  });

  it("空白と記号を落とす（EDINET が社名に入れる空白を含む）", () => {
    expect(normalizeCompanyName("株式会社　サカタのタネ")).toBe(
      normalizeCompanyName("サカタのタネ"),
    );
    expect(normalizeCompanyName("エヌ・ティ・ティ・データ")).toBe(
      normalizeCompanyName("エヌティティデータ"),
    );
  });

  it("法人格しか無い入力は空文字になる", () => {
    expect(normalizeCompanyName("株式会社")).toBe("");
    expect(normalizeCompanyName("  ")).toBe("");
  });

  it("別会社どうしが同じキーに潰れない", () => {
    expect(normalizeCompanyName("トヨタ自動車")).not.toBe(normalizeCompanyName("トヨタ紡織"));
  });
});
