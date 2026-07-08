/**
 * 対象ユーザーが存在しない、または本人でないアクセスを表す例外。
 *
 * 情報秘匿のため「非存在」と「非本人」を区別せず、いずれも本エラーにまとめ、
 * Route 層で 404 に変換する（他人の id を指定しても存在有無を漏らさない）。
 */
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found or not accessible: ${userId}`);
    this.name = "UserNotFoundError";
  }
}
