/** 面接セッションの長さ。未指定時は STANDARD を使う。 */
export enum InterviewLength {
  SHORT = "SHORT",
  STANDARD = "STANDARD",
  LONG = "LONG",
}

export const INTERVIEW_LENGTH_VALUES = [
  InterviewLength.SHORT,
  InterviewLength.STANDARD,
  InterviewLength.LONG,
] as const;

export const DEFAULT_INTERVIEW_LENGTH = InterviewLength.STANDARD;

/** 永続化済み文字列を安全にドメイン値へ解決する。 */
export function resolveInterviewLength(
  value: InterviewLength | string | null | undefined,
): InterviewLength {
  return INTERVIEW_LENGTH_VALUES.includes(value as InterviewLength)
    ? (value as InterviewLength)
    : DEFAULT_INTERVIEW_LENGTH;
}
