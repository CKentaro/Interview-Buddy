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
