import type { JobPostingContext } from "../model/JobPosting.vo";

/**
 * ページ本文から面接練習用の文脈を抽出する契約（ポート）。
 *
 * 求人サイトごとにフォーマットが異なりルールでは吸収できないため、実装は
 * LLM を用いる（インフラ層）。ドメイン／アプリケーション層はこの契約だけを見る。
 */
export interface IJobPostingExtractor {
  extract(pageText: string): Promise<JobPostingContext>;
}
