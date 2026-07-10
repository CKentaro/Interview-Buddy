/**
 * JST（Asia/Tokyo, UTC+9・DST 無し）基準の日付ユーティリティ。
 *
 * 面接アプリのレート制限（音声あり面接 1 日 1 回）は日本時間の 0 時を日境界とする。
 * サーバーのタイムゾーンに依存しないよう、UTC からの固定オフセットで計算する。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** JST における「今日の 0 時」を UTC の Date（絶対時刻）で返す。 */
export function startOfTodayJst(now: Date): Date {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  jst.setUTCHours(0, 0, 0, 0);
  return new Date(jst.getTime() - JST_OFFSET_MS);
}

/** JST の暦日を "YYYY-MM-DD" で返す（日次レート枠のキーに使う）。 */
export function jstDateString(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
