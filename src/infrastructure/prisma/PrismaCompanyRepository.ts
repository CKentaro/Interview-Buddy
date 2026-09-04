import type { Company } from "@/domain/company/model/Company.entity";
import type { ICompanyRepository } from "@/domain/company/ports/ICompanyRepository";
import { rankCompanyCandidates } from "@/domain/company/services/rankCompanyCandidates";
import { prisma } from "@/lib/prisma";

/** Prisma の行 → ドメインの Company。 */
type CompanyRow = {
  id: string;
  edinetCode: string | null;
  corporateNumber: string | null;
  name: string;
  nameKana: string | null;
  securitiesCode: string | null;
  isListed: boolean;
  industryLabel: string | null;
  capitalMillionYen: number | null;
};

function toDomain(row: CompanyRow): Company {
  return {
    id: row.id,
    edinetCode: row.edinetCode,
    corporateNumber: row.corporateNumber,
    name: row.name,
    nameKana: row.nameKana,
    securitiesCode: row.securitiesCode,
    isListed: row.isListed,
    industryLabel: row.industryLabel,
    capitalMillionYen: row.capitalMillionYen,
  };
}

/** searchKey は検索専用の列なので、ドメインへは返さず where 句だけで使う。 */
const SELECT = {
  id: true,
  edinetCode: true,
  corporateNumber: true,
  name: true,
  nameKana: true,
  securitiesCode: true,
  isListed: true,
  industryLabel: true,
  capitalMillionYen: true,
} as const;

/**
 * 並び替えのために DB から多めに取る倍率。
 * 名前の長さによる優先度は SQL で表現しづらいため、候補を広めに取って
 * {@link rankCompanyCandidates} で並べ替える。
 */
const OVERFETCH_FACTOR = 5;
const MAX_OVERFETCH = 100;

/**
 * DB 側の並び順。**take で打ち切る前に必ず適用する。**
 *
 * 「日本」のように数百件一致する語では、order 無しの take が拾うのはヒープ順の
 * 先頭 N 件でしかなく、日本郵政のような代表的な企業が候補に一度も出てこない
 * （しかも seed の更新で行の並びが変わると結果が黙って変わる）。規模の大きい
 * 企業から窓に入れることで、後段の並べ替えが意味を持つようにする。
 * capitalMillionYen は null がありうるので、明示的に最後へ送る。
 */
const CANDIDATE_ORDER = [
  { isListed: "desc" },
  { capitalMillionYen: { sort: "desc", nulls: "last" } },
  { name: "asc" },
] as const;

export class PrismaCompanyRepository implements ICompanyRepository {
  async searchByNormalizedName(
    normalizedQuery: string,
    limit: number,
  ): Promise<Company[]> {
    if (normalizedQuery === "" || limit <= 0) {
      return [];
    }
    const window = Math.min(limit * OVERFETCH_FACTOR, MAX_OVERFETCH);

    // 前方一致を先に取り切る。「トヨタ」で豊田通商のような部分一致に窓を
    // 埋められて、肝心のトヨタ自動車が落ちるのを防ぐ。
    const prefixRows = await prisma.company.findMany({
      where: { searchKey: { startsWith: normalizedQuery } },
      select: SELECT,
      orderBy: [...CANDIDATE_ORDER],
      take: window,
    });

    // 残りを部分一致で埋める（前方一致だけで窓が埋まっていれば追加の問い合わせはしない）。
    const rest =
      prefixRows.length >= window
        ? []
        : await prisma.company.findMany({
            where: {
              searchKey: { contains: normalizedQuery },
              NOT: { searchKey: { startsWith: normalizedQuery } },
            },
            select: SELECT,
            orderBy: [...CANDIDATE_ORDER],
            take: window - prefixRows.length,
          });

    return rankCompanyCandidates(
      [...prefixRows, ...rest].map(toDomain),
      normalizedQuery,
      limit,
    );
  }

  async findByNormalizedName(normalizedName: string): Promise<Company | null> {
    if (normalizedName === "") {
      return null;
    }
    // 完全一致でも同名の法人が複数ありうる（子会社・商号変更後の残存など）。
    // 上場企業を優先し、決められなければ紐づけない（誤った企業に結びつけないため）。
    const rows = await prisma.company.findMany({
      where: { searchKey: normalizedName },
      select: SELECT,
      take: 2,
      orderBy: [...CANDIDATE_ORDER],
    });
    const [first, second] = rows;
    if (first === undefined) return null;
    if (second !== undefined && second.isListed === first.isListed) return null;
    return toDomain(first);
  }

  async findById(id: string): Promise<Company | null> {
    const row = await prisma.company.findUnique({ where: { id }, select: SELECT });
    return row === null ? null : toDomain(row);
  }
}
