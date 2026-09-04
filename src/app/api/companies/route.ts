import { toErrorResponse } from "@/app/api/httpError";
import type { CompanySearchResponse } from "@/app/api/types";
import { SearchCompaniesUseCase } from "@/application/company/SearchCompaniesUseCase";
import { PrismaCompanyRepository } from "@/infrastructure/prisma/PrismaCompanyRepository";
import { requireUser } from "@/lib/auth-guard";

/** 入力しながら引く用途なので、1 回の検索語はこの長さで打ち切る。 */
const MAX_QUERY_LENGTH = 100;

/**
 * GET /api/companies?q=… — 企業名の候補を返す。
 *
 * 候補が無いことは異常ではない（マスタは有価証券報告書の提出会社のみで、
 * 収録外の企業は自由入力のまま面接練習できる）ため、常に 200 で空配列を返す。
 */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").slice(0, MAX_QUERY_LENGTH);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : undefined;

    const useCase = new SearchCompaniesUseCase(new PrismaCompanyRepository());
    const companies = await useCase.execute(query, limit);

    const response: CompanySearchResponse = {
      companies: companies.map((company) => ({
        id: company.id,
        name: company.name,
        securitiesCode: company.securitiesCode,
        isListed: company.isListed,
        industryLabel: company.industryLabel,
      })),
    };
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error, "GET /api/companies");
  }
}
