import { describe, expect, it, vi } from "vitest";

import type { Company } from "@/domain/company/model/Company.entity";
import type { ICompanyRepository } from "@/domain/company/ports/ICompanyRepository";
import {
  MAX_COMPANY_SEARCH_LIMIT,
  SearchCompaniesUseCase,
} from "./SearchCompaniesUseCase";

function createRepository(result: Company[] = []) {
  const searchByNormalizedName = vi.fn().mockResolvedValue(result);
  const repository = {
    searchByNormalizedName,
    findByNormalizedName: vi.fn(),
    findById: vi.fn(),
  } satisfies ICompanyRepository;
  return { repository, searchByNormalizedName };
}

describe("SearchCompaniesUseCase", () => {
  it("正規化した文字列で検索する（法人格や記号の入力を吸収する）", async () => {
    const { repository, searchByNormalizedName } = createRepository();

    await new SearchCompaniesUseCase(repository).execute("株式会社トヨタ自動車");

    expect(searchByNormalizedName).toHaveBeenCalledWith("トヨタ自動車", 8);
  });

  it("短すぎる入力では検索せず空を返す", async () => {
    const { repository, searchByNormalizedName } = createRepository();

    await expect(new SearchCompaniesUseCase(repository).execute("ト")).resolves.toEqual([]);
    // 法人格だけの入力も、正規化すると空になるので検索しない。
    await expect(new SearchCompaniesUseCase(repository).execute("株式会社")).resolves.toEqual([]);
    expect(searchByNormalizedName).not.toHaveBeenCalled();
  });

  it("limit は上限で頭打ちにする", async () => {
    const { repository, searchByNormalizedName } = createRepository();

    await new SearchCompaniesUseCase(repository).execute("トヨタ", 500);

    expect(searchByNormalizedName).toHaveBeenCalledWith("トヨタ", MAX_COMPANY_SEARCH_LIMIT);
  });
});
