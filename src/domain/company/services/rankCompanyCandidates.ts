import type { Company } from "../model/Company.entity";
import { normalizeCompanyName } from "./normalizeCompanyName";

/**
 * 企業名の候補を「選びたい企業が上に来る」順に並べるドメインサービス。
 *
 * 優先順位は次の 3 つ。
 *   1. 前方一致（「トヨタ」なら「トヨタ自動車」が「豊田通商」より先）
 *   2. 上場企業（似た名前が並ぶとき、代表的な企業を先に）
 *   3. 資本金が大きい順（「トヨタ」で紡織より自動車が先に来るための決め手）
 *   4. 名前が短い順（規模が同じなら、親会社が子会社・関連会社より先に来やすい）
 *
 * DB の ORDER BY では 1 と 3 を素直に書けないため、候補を多めに取ってここで並べ替える
 * （収録は約 7 千件なので、多めに取る負荷は問題にならない）。純粋関数なので、
 * 並び順の意図をテストで固定できる。
 */
export function rankCompanyCandidates(
  candidates: readonly Company[],
  normalizedQuery: string,
  limit: number,
): Company[] {
  const startsWithQuery = (company: Company): boolean =>
    normalizeCompanyName(company.name).startsWith(normalizedQuery);

  return [...candidates]
    .sort((a, b) => {
      const byPrefix = Number(startsWithQuery(b)) - Number(startsWithQuery(a));
      if (byPrefix !== 0) return byPrefix;
      if (a.isListed !== b.isListed) return a.isListed ? -1 : 1;
      const byCapital = (b.capitalMillionYen ?? 0) - (a.capitalMillionYen ?? 0);
      if (byCapital !== 0) return byCapital;
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return a.name.localeCompare(b.name, "ja");
    })
    .slice(0, limit);
}
