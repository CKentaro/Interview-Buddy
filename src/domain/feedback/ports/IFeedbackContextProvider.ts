import type { FeedbackQARow } from "../services/buildFeedbackContext";

/**
 * フィードバック生成に必要な Q&A を読み出すポート。
 *
 * feedback は interview とは別の境界づけられたコンテキストのため、
 * `IInterviewSessionRepository` を直接使わず、生成に必要な読み取りだけをこのポートで表す。
 * 軸別グルーピング自体は純粋関数 {@link buildFeedbackContext} が担い、ここは取得のみ。
 */
export interface IFeedbackContextProvider {
  /**
   * セッションの全質問＋回答を displayOrder 昇順で取得する（未回答は answerText が null）。
   * 深掘り質問も含む（主軸は親 MainQuestion の primaryAxis を引き継ぐ想定）。
   */
  loadQARows(sessionId: string): Promise<FeedbackQARow[]>;
}
