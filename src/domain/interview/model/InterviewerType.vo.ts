export const INTERVIEWER_TYPES = ["friendly", "neutral", "strict"] as const;

export type InterviewerType = (typeof INTERVIEWER_TYPES)[number];

export const DEFAULT_INTERVIEWER_TYPE: InterviewerType = "neutral";

export function isInterviewerType(value: unknown): value is InterviewerType {
  return (
    typeof value === "string" &&
    INTERVIEWER_TYPES.some((interviewerType) => interviewerType === value)
  );
}

/** 未設定・過去データの不正値は標準的な面接官として扱う。 */
export function resolveInterviewerType(
  value: string | null | undefined,
): InterviewerType {
  return isInterviewerType(value) ? value : DEFAULT_INTERVIEWER_TYPE;
}
