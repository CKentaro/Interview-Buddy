import { describe, expect, it } from "vitest";

import type { Company } from "../model/Company.entity";
import { normalizeCompanyName } from "./normalizeCompanyName";
import { rankCompanyCandidates } from "./rankCompanyCandidates";

function company(name: string, isListed = true, capitalMillionYen: number | null = null): Company {
  return {
    id: name,
    edinetCode: null,
    corporateNumber: null,
    name,
    nameKana: null,
    securitiesCode: null,
    isListed,
    industryLabel: null,
    capitalMillionYen,
  };
}

/** 候補を与えて、並び替え後の社名だけを取り出す。 */
function rank(names: Company[], query: string, limit = 10): string[] {
  return rankCompanyCandidates(names, normalizeCompanyName(query), limit).map((c) => c.name);
}

describe("rankCompanyCandidates", () => {
  it("前方一致を、途中に含むだけの企業より先に出す", () => {
    const result = rank(
      [company("豊田通商株式会社"), company("トヨタ自動車株式会社")],
      "トヨタ自動",
    );

    expect(result[0]).toBe("トヨタ自動車株式会社");
  });

  it("前方一致どうしなら上場企業を先に出す", () => {
    const result = rank(
      [company("トヨタスタッフサービス株式会社", false), company("トヨタ紡織株式会社", true)],
      "トヨタ",
    );

    expect(result[0]).toBe("トヨタ紡織株式会社");
  });

  it("前方一致・上場が同じなら資本金の大きい順（規模の大きい企業を先に）", () => {
    const result = rank(
      [company("トヨタ紡織株式会社", true, 8400), company("トヨタ自動車株式会社", true, 635401)],
      "トヨタ",
    );

    expect(result[0]).toBe("トヨタ自動車株式会社");
  });

  it("資本金が同じ（または不明）なら名前の短い順（親会社が先に来やすい）", () => {
    const result = rank(
      [company("三菱商事ロジスティクス株式会社"), company("三菱商事株式会社")],
      "三菱商事",
    );

    expect(result).toEqual(["三菱商事株式会社", "三菱商事ロジスティクス株式会社"]);
  });

  it("法人格の位置が違っても前方一致と判定する（正規化を共有しているため）", () => {
    const result = rank([company("株式会社サカタのタネ"), company("日本サカタ株式会社")], "サカタ");

    expect(result[0]).toBe("株式会社サカタのタネ");
  });

  it("limit で件数を切る", () => {
    const result = rank([company("A社"), company("B社"), company("C社")], "社", 2);

    expect(result).toHaveLength(2);
  });
});
