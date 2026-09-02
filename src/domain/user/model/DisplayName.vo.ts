/** 表示名の最大文字数。DB は制限しないのでドメイン側で上限を持つ。 */
export const DISPLAY_NAME_MAX_LENGTH = 50;

/**
 * 表示名（ユビキタス言語: DisplayName）。
 *
 * 初回は Google アカウントの名前が入るが、本名で練習したくない利用者のために
 * オンボーディングとマイページで編集できる。未設定（null）も許す。
 */
export type DisplayName = string;

/**
 * 入力された表示名を正規化する。
 * - 前後の空白を落とし、連続する空白は 1 つにまとめる
 * - 空文字は「未設定」として null
 * - 上限を超える分は切り詰める（入力を弾くより、そのまま保存できる方が親切）
 */
export function normalizeDisplayName(
  raw: string | null | undefined,
): DisplayName | null {
  if (raw == null) {
    return null;
  }
  const collapsed = raw.trim().replace(/\s+/gu, " ");
  if (collapsed === "") {
    return null;
  }
  return collapsed.slice(0, DISPLAY_NAME_MAX_LENGTH);
}
