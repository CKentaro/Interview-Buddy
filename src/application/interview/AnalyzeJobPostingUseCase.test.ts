import { describe, expect, it, vi } from "vitest";

import type { Company } from "@/domain/company/model/Company.entity";
import type { ICompanyRepository } from "@/domain/company/ports/ICompanyRepository";

import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import {
  EmploymentKind,
  JobPostingPageKind,
} from "@/domain/interview/model/JobPosting.vo";
import type { IJobPostingExtractor } from "@/domain/interview/ports/IJobPostingExtractor";
import type {
  FetchedPage,
  IJobPostingFetcher,
} from "@/domain/interview/ports/IJobPostingFetcher";
import {
  JobPostingFetchError,
  JobPostingFetchFailureReason,
} from "@/domain/interview/ports/IJobPostingFetcher";
import {
  AnalyzeJobPostingUseCase,
  JobPostingExtractionError,
} from "./AnalyzeJobPostingUseCase";

const context: JobPostingContext = {
  pageKind: JobPostingPageKind.SINGLE_JOB_POSTING,
  usableAsContext: true,
  companyName: "株式会社テスト",
  industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
  job: { major: "技術系", minor: "Webエンジニア" },
  employmentKind: EmploymentKind.NEW_GRADUATE,
  businessSummary: "テスト事業",
  jobSummary: "テスト職務",
  keyPoints: ["特徴1"],
};

class FakeFetcher implements IJobPostingFetcher {
  constructor(private readonly result: FetchedPage | JobPostingFetchError) {}
  requestedUrl: string | null = null;

  async fetch(url: string): Promise<FetchedPage> {
    this.requestedUrl = url;
    if (this.result instanceof JobPostingFetchError) {
      throw this.result;
    }
    return this.result;
  }
}

class FakeExtractor implements IJobPostingExtractor {
  receivedText: string | null = null;
  constructor(private readonly result: JobPostingContext | Error) {}

  async extract(pageText: string): Promise<JobPostingContext> {
    this.receivedText = pageText;
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

const matchedCompany: Company = {
  id: "company-1",
  edinetCode: "E00000",
  corporateNumber: "1234567890123",
  name: "株式会社テスト",
  nameKana: null,
  securitiesCode: "1234",
  isListed: true,
  industryLabel: "情報・通信業",
  capitalMillionYen: 1000,
};

/** findByNormalizedName だけを持つ企業マスタの代役。 */
function createCompanyRepository(match: Company | null) {
  const findByNormalizedName = vi.fn().mockResolvedValue(match);
  const repository = {
    searchByNormalizedName: vi.fn(),
    findByNormalizedName,
    findById: vi.fn(),
  } satisfies ICompanyRepository;
  return { repository, findByNormalizedName };
}

function analyzedPage(): FakeFetcher {
  return new FakeFetcher({ finalUrl: "https://example.com/jobs/1", text: "求人本文" });
}

describe("AnalyzeJobPostingUseCase", () => {
  it("取得した本文を抽出器に渡し、最終 URL とともに結果を返す", async () => {
    const fetcher = new FakeFetcher({
      finalUrl: "https://example.com/jobs/1",
      text: "求人本文",
    });
    const extractor = new FakeExtractor(context);

    const result = await new AnalyzeJobPostingUseCase(fetcher, extractor).execute({
      url: "http://example.com/jobs/1",
    });

    expect(fetcher.requestedUrl).toBe("http://example.com/jobs/1");
    expect(extractor.receivedText).toBe("求人本文");
    // 企業マスタを渡さない構成では紐づけを試みない（company は null）。
    expect(result).toEqual({
      finalUrl: "https://example.com/jobs/1",
      context,
      company: null,
    });
  });

  it("取得失敗はそのまま伝播させ、UI が理由を出し分けられるようにする", async () => {
    const fetchError = new JobPostingFetchError(
      JobPostingFetchFailureReason.EMPTY_CONTENT,
      "本文なし",
    );
    const useCase = new AnalyzeJobPostingUseCase(
      new FakeFetcher(fetchError),
      new FakeExtractor(context),
    );

    await expect(useCase.execute({ url: "https://example.com/" })).rejects.toBe(
      fetchError,
    );
  });

  it("抽出の失敗は JobPostingExtractionError に包む", async () => {
    const useCase = new AnalyzeJobPostingUseCase(
      new FakeFetcher({ finalUrl: "https://example.com/", text: "本文" }),
      new FakeExtractor(new Error("LLM error")),
    );

    await expect(useCase.execute({ url: "https://example.com/" })).rejects.toBeInstanceOf(
      JobPostingExtractionError,
    );
  });
});

describe("AnalyzeJobPostingUseCase（企業マスタとの紐づけ）", () => {
  it("抽出した企業名を正規化して照合し、一致した企業を返す", async () => {
    const { repository, findByNormalizedName } = createCompanyRepository(matchedCompany);

    const result = await new AnalyzeJobPostingUseCase(
      analyzedPage(),
      new FakeExtractor(context),
      repository,
    ).execute({ url: "https://example.com/jobs/1" });

    // 「株式会社テスト」は法人格を落とした形で照合する。
    expect(findByNormalizedName).toHaveBeenCalledWith("テスト");
    expect(result.company).toEqual(matchedCompany);
  });

  it("一致する企業が無ければ null（企業名の文字列だけで練習できる）", async () => {
    const { repository } = createCompanyRepository(null);

    const result = await new AnalyzeJobPostingUseCase(
      analyzedPage(),
      new FakeExtractor(context),
      repository,
    ).execute({ url: "https://example.com/jobs/1" });

    expect(result.company).toBeNull();
  });

  it("企業名を抽出できなかったページでは照合しない", async () => {
    const { repository, findByNormalizedName } = createCompanyRepository(matchedCompany);

    const result = await new AnalyzeJobPostingUseCase(
      analyzedPage(),
      new FakeExtractor({ ...context, companyName: null }),
      repository,
    ).execute({ url: "https://example.com/jobs/1" });

    expect(findByNormalizedName).not.toHaveBeenCalled();
    expect(result.company).toBeNull();
  });
});
