/** 取得したページの本文。 */
export type FetchedPage = {
  /** リダイレクト追跡後の最終 URL。 */
  finalUrl: string;
  /** HTML からタグを除いた本文テキスト。 */
  text: string;
};

/** 取得に失敗した理由。UI の文言出し分けに使う。 */
export enum JobPostingFetchFailureReason {
  /** URL の形式が不正、または許可されないスキーム・宛先。 */
  INVALID_URL = "INVALID_URL",
  /** 到達できない・タイムアウト・WAF による遮断。 */
  UNREACHABLE = "UNREACHABLE",
  /** HTML ではない（PDF・画像など）。 */
  UNSUPPORTED_CONTENT = "UNSUPPORTED_CONTENT",
  /** 取得はできたが本文がほとんど無い（CSR・ログイン要求など）。 */
  EMPTY_CONTENT = "EMPTY_CONTENT",
}

/** ページ取得に失敗したことを表す例外。 */
export class JobPostingFetchError extends Error {
  constructor(readonly reason: JobPostingFetchFailureReason, message: string) {
    super(message);
    this.name = "JobPostingFetchError";
  }
}

/**
 * URL からページ本文を取得する契約（ポート）。
 *
 * 実装（HTTP アクセス・SSRF 対策・HTML パース）はインフラ層に置く。
 */
export interface IJobPostingFetcher {
  fetch(url: string): Promise<FetchedPage>;
}
