import type { TaxonomyPair } from "./careerTaxonomy";

/**
 * 解析対象ページの種別。
 *
 * 「求人票か否か」の真偽値ではなく種別として持つ。企業の採用トップページは
 * 求人票ではないが、企業名・業界・事業内容は取れるため設定の補完には使える。
 * 真偽値にすると、この「部分的に使える」ケースを表現できない。
 */
export enum JobPostingPageKind {
  /** 1 職種の募集要項。最も情報が揃う。 */
  SINGLE_JOB_POSTING = "SINGLE_JOB_POSTING",
  /** 複数の求人が並ぶ一覧・検索結果。個別 URL を促す。 */
  JOB_LIST = "JOB_LIST",
  /** 企業の採用トップ。職種は取れないが企業情報は取れる。 */
  COMPANY_RECRUIT_PAGE = "COMPANY_RECRUIT_PAGE",
  /** 404 / ログイン要求 / 本文が取得できていない。 */
  ERROR_OR_LOGIN = "ERROR_OR_LOGIN",
  /** 採用と無関係なページ。 */
  OTHER = "OTHER",
}

/** 募集の雇用区分。生成する質問を新卒向け／中途向けに切り替えるために使う。 */
export enum EmploymentKind {
  NEW_GRADUATE = "NEW_GRADUATE",
  MID_CAREER = "MID_CAREER",
  UNKNOWN = "UNKNOWN",
}

/**
 * 求人ページから抽出した面接練習用の文脈（ユビキタス言語: JobPosting）。
 *
 * 抽出できなかった項目は null のまま保持する。フォームの補完は「埋まった項目
 * だけ反映し、残りはユーザーが入力する」方針のため、欠損を欠損として表現できる
 * ことが要件になる。
 */
export type JobPostingContext = {
  pageKind: JobPostingPageKind;
  /**
   * 面接質問の材料として十分な具体性があるか。
   * SINGLE_JOB_POSTING でなくとも（企業の採用トップでも）true になりうる。
   */
  usableAsContext: boolean;
  companyName: string | null;
  /** マスタと照合済みの業界。候補外なら null。 */
  industry: TaxonomyPair | null;
  /** マスタと照合済みの職種。候補外・判別不能なら null。 */
  job: TaxonomyPair | null;
  employmentKind: EmploymentKind;
  /** 事業内容の要約。 */
  businessSummary: string | null;
  /** 職務内容の要約。求人票以外では null になりやすい。 */
  jobSummary: string | null;
  /** 質問生成の材料になる特徴（求める人物像・技術・カルチャー・事業課題など）。 */
  keyPoints: string[];
};

/**
 * 面接質問の生成に使える文脈かどうか。
 *
 * `usableAsContext` は LLM の出力であり、クライアント経由でサーバーへ戻ってくる
 * 経路もあるため、単体では信用できない。ページ種別と矛盾する組み合わせ
 * （エラーページなのに使える等）をここで必ず打ち消す。抽出直後と、実際に生成へ
 * 進む直前の双方でこの関数を通すこと。
 */
export function isUsableAsQuestionContext(context: JobPostingContext): boolean {
  return (
    context.usableAsContext &&
    context.pageKind !== JobPostingPageKind.ERROR_OR_LOGIN &&
    context.pageKind !== JobPostingPageKind.OTHER
  );
}
