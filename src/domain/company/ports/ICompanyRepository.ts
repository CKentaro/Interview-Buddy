import type { Company } from "../model/Company.entity";

/** 企業マスタの読み取り口。書き込みはシード（prisma/seed.ts）が担うため持たない。 */
export interface ICompanyRepository {
  /**
   * 正規化済みの検索キーで部分一致検索する。
   * 並び順は「前方一致 → 上場 → 名前の短い順」で、代表的な企業を先頭に出す。
   */
  searchByNormalizedName(normalizedQuery: string, limit: number): Promise<Company[]>;

  /** 正規化済みの名前に完全一致する企業を 1 件返す（求人ページからの自動紐づけ用）。 */
  findByNormalizedName(normalizedName: string): Promise<Company | null>;

  findById(id: string): Promise<Company | null>;
}
