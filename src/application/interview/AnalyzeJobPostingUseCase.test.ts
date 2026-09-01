import { describe, expect, it } from "vitest";

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
    expect(result).toEqual({ finalUrl: "https://example.com/jobs/1", context });
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
