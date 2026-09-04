import type { Company } from "@/domain/company/model/Company.entity";
import type { ICompanyRepository } from "@/domain/company/ports/ICompanyRepository";
import { normalizeCompanyName } from "@/domain/company/services/normalizeCompanyName";
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
  /**
   * 抽出した企業名と一致した企業マスタのレコード。一致しなければ null。
   * 練習履歴を企業ごとにまとめるための紐づけに使う。
   */
  company: Company | null;
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
    private readonly companyRepository?: ICompanyRepository,
  ) {}

  async execute(input: AnalyzeJobPostingInput): Promise<AnalyzeJobPostingResult> {
    const page = await this.fetcher.fetch(input.url);
    let context: JobPostingContext;
    try {
      context = await this.extractor.extract(page.text);
    } catch (error) {
      throw new JobPostingExtractionError(error);
    }
    return {
      finalUrl: page.finalUrl,
      context,
      company: await this.matchCompany(context.companyName),
    };
  }

  /**
   * 抽出した企業名を企業マスタと突き合わせる。
   *
   * 正規化した名前の**完全一致**だけを採用する。部分一致で拾うと「〇〇銀行」から
   * 別のグループ会社に紐づくような誤りが起きるうえ、間違った紐づけは履歴の集計を
   * 静かに壊す。確信が持てないときは null（＝自由入力の企業名だけを保持）にする。
   */
  private async matchCompany(companyName: string | null): Promise<Company | null> {
    if (companyName === null || this.companyRepository === undefined) {
      return null;
    }
    const normalized = normalizeCompanyName(companyName);
    if (normalized === "") {
      return null;
    }
    return this.companyRepository.findByNormalizedName(normalized);
  }
}
