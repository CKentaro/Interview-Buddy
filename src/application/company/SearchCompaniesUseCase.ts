import type { Company } from "@/domain/company/model/Company.entity";
import type { ICompanyRepository } from "@/domain/company/ports/ICompanyRepository";
import { normalizeCompanyName } from "@/domain/company/services/normalizeCompanyName";

/** 一度に返す候補の既定件数と上限（入力しながら引くため、多すぎても選べない）。 */
export const DEFAULT_COMPANY_SEARCH_LIMIT = 8;
export const MAX_COMPANY_SEARCH_LIMIT = 20;
/** これより短い入力では候補を出さない（1 文字では候補が絞れず、実質全件になる）。 */
export const MIN_COMPANY_SEARCH_LENGTH = 2;

/**
 * 企業名の候補検索ユースケース。
 *
 * 入力は正規化してから検索するので、「株式会社トヨタ」「トヨタ(株)」のどちらでも
 * 同じ候補が出る。候補が無くても呼び出し側はエラーにしない（マスタに無い企業は
 * 自由入力のまま面接練習できる、というのがこの機能の前提）。
 */
export class SearchCompaniesUseCase {
  constructor(private readonly companyRepository: ICompanyRepository) {}

  async execute(query: string, limit?: number): Promise<Company[]> {
    const normalized = normalizeCompanyName(query);
    if (normalized.length < MIN_COMPANY_SEARCH_LENGTH) {
      return [];
    }
    const effectiveLimit = Math.min(
      limit ?? DEFAULT_COMPANY_SEARCH_LIMIT,
      MAX_COMPANY_SEARCH_LIMIT,
    );
    return this.companyRepository.searchByNormalizedName(normalized, effectiveLimit);
  }
}
