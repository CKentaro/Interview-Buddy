/**
 * JST（Asia/Tokyo, UTC+9・DST 無し）基準の日付ユーティリティ。
 *
 * 面接アプリのレート制限（音声あり面接 1 日 1 回）は日本時間の 0 時を日境界とする。
 * サーバーのタイムゾーンに依存しないよう、UTC からの固定オフセットで計算する。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** JST の暦日を "YYYY-MM-DD" で返す（日次レート枠のキーに使う）。 */
export function jstDateString(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
