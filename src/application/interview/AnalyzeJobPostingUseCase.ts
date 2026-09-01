import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import type { IJobPostingExtractor } from "@/domain/interview/ports/IJobPostingExtractor";
import type { IJobPostingFetcher } from "@/domain/interview/ports/IJobPostingFetcher";

export type AnalyzeJobPostingInput = {
  url: string;
};

export type AnalyzeJobPostingResult = {
  /** リダイレクト追跡後の最終 URL。何を解析したかを利用者に示すために返す。 */
  finalUrl: string;
  context: JobPostingContext;
};

/** 抽出（LLM 呼び出し）に失敗したことを表す例外。 */
export class JobPostingExtractionError extends Error {
  constructor(readonly cause: unknown) {
    super("求人ページの解析に失敗しました");
    this.name = "JobPostingExtractionError";
  }
}

/**
 * 求人ページ URL を解析し、面接設定に使える文脈を取り出すユースケース。
 *
 * 取得失敗（JobPostingFetchError）はそのまま呼び出し側へ伝える。フォームの
 * 自動入力は補助機能であり、失敗しても手入力で面接を開始できるため、ここで
 * 握りつぶさず理由つきで返して UI に出し分けさせる。
 */
export class AnalyzeJobPostingUseCase {
  constructor(
    private readonly fetcher: IJobPostingFetcher,
    private readonly extractor: IJobPostingExtractor,
  ) {}

  async execute(input: AnalyzeJobPostingInput): Promise<AnalyzeJobPostingResult> {
    const page = await this.fetcher.fetch(input.url);
    try {
      const context = await this.extractor.extract(page.text);
      return { finalUrl: page.finalUrl, context };
    } catch (error) {
      throw new JobPostingExtractionError(error);
    }
  }
}
