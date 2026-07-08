/**
 * フィードバック生成のタイムアウト（ミリ秒）。
 *
 * 面接終了（endedAt）からこの時間を過ぎても Feedback が保存されていなければ、
 * 非同期生成が失敗/タイムアウトしたとみなす。
 */
export const FEEDBACK_TIMEOUT_MS = 90_000;

/** フィードバック取得時のステータス（フロントのポーリング判定に使う）。 */
export type FeedbackStatus = "generating" | "failed" | "completed";

/**
 * フィードバックのステータスを判定する純粋関数（副作用なし・時刻は引数で受ける）。
 *
 * 生成は非同期のため、DB に Feedback がまだ無い状態を「生成中」か「失敗」に
 * 切り分ける。判定は以下の優先順で行う:
 * 1. Feedback が既にある → completed
 * 2. 面接が未終了（endedAt が null）→ generating（そもそも生成が始まっていない）
 * 3. 終了から FEEDBACK_TIMEOUT_MS 以上経過 → failed（生成が失敗/タイムアウト）
 * 4. それ以外 → generating（生成中）
 */
export function determineFeedbackStatus(
  hasFeedback: boolean,
  endedAt: Date | null,
  now: Date,
): FeedbackStatus {
  if (hasFeedback) {
    return "completed";
  }
  if (endedAt === null) {
    return "generating";
  }
  if (now.getTime() - endedAt.getTime() >= FEEDBACK_TIMEOUT_MS) {
    return "failed";
  }
  return "generating";
}
