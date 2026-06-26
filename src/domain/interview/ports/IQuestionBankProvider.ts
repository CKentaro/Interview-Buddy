import type { QuestionBank } from "../model/QuestionBank";

/**
 * 質問バンクの取得に対する契約（ポート）。
 *
 * バンクの実体（JSON ファイルや DB）はインフラ層に置き、ドメイン／
 * アプリケーション層はこのインターフェース経由でバンクを得る（依存性逆転）。
 */
export interface IQuestionBankProvider {
  load(): QuestionBank;
}
