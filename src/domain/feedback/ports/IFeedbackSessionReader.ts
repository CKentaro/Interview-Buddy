/**
 * フィードバック文脈が必要とする、面接セッションの最小限の読み取り情報。
 *
 * フィードバックのステータス判定（{@link ../services/determineFeedbackStatus}）には
 * 面接の終了時刻だけが必要。session の詳細は interview 文脈の責務なので、こちらは
 * 必要な値だけを持つ read model として定義する。
 */
export type SessionFeedbackState = {
  /** 面接の終了時刻。未終了なら null。 */
  endedAt: Date | null;
};

/**
 * フィードバック文脈から面接セッションの状態を読むためのポート。
 *
 * feedback は interview とは別の境界づけられたコンテキストのため、
 * `IInterviewSessionRepository` を直接使わず、必要な読み取りだけをこのポートで表す。
 * 実装（Prisma）はインフラ層に置く（依存性逆転）。
 */
export interface IFeedbackSessionReader {
  /**
   * 指定ユーザーが所有するセッションの状態を取得する。
   * 存在しない、または本人のセッションでなければ null（呼び出し側で 404 秘匿に使う）。
   */
  findOwnedSessionState(
    userId: string,
    sessionId: string,
  ): Promise<SessionFeedbackState | null>;
}
