/**
 * 同一セッションに Feedback が既に存在するのに保存を試みたことを表すドメインエラー。
 *
 * 二重生成ガード（`findBySessionId` による事前チェック）をすり抜けた並行実行で、
 * DB の一意制約（Feedback.sessionId @unique）に弾かれたケースを表現する。
 * これは「別の生成が先に成功した」ことを意味するため、呼び出し側は失敗ではなく
 * 冪等な no-op として扱ってよい。
 */
export class FeedbackAlreadyExistsError extends Error {
  constructor(sessionId: string) {
    super(`Feedback already exists for session: ${sessionId}`);
    this.name = "FeedbackAlreadyExistsError";
  }
}
