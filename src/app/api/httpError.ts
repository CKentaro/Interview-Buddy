import { SessionNotFoundError as FeedbackSessionNotFoundError } from "@/application/feedback/errors";
import { SessionNotFoundError as InterviewSessionNotFoundError } from "@/application/interview/errors";
import { UserNotFoundError } from "@/application/user/errors";
import { UnauthorizedError } from "@/lib/auth-guard";

/** `{ error }` ボディの JSON エラーレスポンス（Web 標準 Response）を作る。 */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * 共通の例外 → HTTP レスポンス変換。
 * - UnauthorizedError → 401
 * - 各文脈の「見つからない/非所有」→ 404（秘匿。存在有無を漏らさない固定文言）
 * - それ以外 → 500（ログを残す）
 *
 * ルート固有の例外（回答フローの 409/502 など）は各ルートで先に処理し、
 * 残りをこのヘルパへ委譲する。
 */
export function toErrorResponse(error: unknown, context: string): Response {
  if (error instanceof UnauthorizedError) {
    return jsonError("Unauthorized", 401);
  }
  if (
    error instanceof InterviewSessionNotFoundError ||
    error instanceof FeedbackSessionNotFoundError ||
    error instanceof UserNotFoundError
  ) {
    return jsonError("Not Found", 404);
  }
  console.error(`${context} failed:`, error);
  return jsonError("Internal Server Error", 500);
}
