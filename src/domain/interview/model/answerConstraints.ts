/**
 * 回答テキストの入力制約（ドメイン不変条件）。
 *
 * API の zod スキーマ・フロントの文字数カウンタもこの値を単一の真実の源として参照し、
 * 3 層で同じ上限を強制する。文字数は UTF-16 コード単位（String.length）で数える。
 */
export const MAX_ANSWER_LENGTH = 500;
