/**
 * セッションが存在しない、または本人のセッションでないアクセスを表す例外。
 *
 * 情報秘匿のため「非存在」と「非所有」を区別せず本エラーにまとめ、Route 層で
 * 404 に変換する。
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found or not accessible: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

/** 現在の状態では要求されたセッション操作を実行できない。 */
export class SessionStatusConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionStatusConflictError";
  }
}
