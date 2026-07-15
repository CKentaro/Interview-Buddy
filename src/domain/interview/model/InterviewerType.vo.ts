export const INTERVIEWER_TYPES = ["friendly", "neutral", "strict"] as const;

export type InterviewerType = (typeof INTERVIEWER_TYPES)[number];

export const DEFAULT_INTERVIEWER_TYPE: InterviewerType = "neutral";

/**
 * 面接官タイプの日本語ラベルの単一の真実源。
 * 設定画面・履歴一覧・振り返り画面はここを参照し、表記ゆれと生キー（"friendly" 等）の
 * 画面表示を避ける。
 */
export const INTERVIEWER_TYPE_LABEL: Record<InterviewerType, string> = {
  friendly: "フレンドリー",
  neutral: "ニュートラル",
  strict: "厳しめ",
};

/** 未設定・過去データの不正値も既定タイプのラベルに落として表示する。 */
export function interviewerTypeLabel(value: string | null | undefined): string {
  return INTERVIEWER_TYPE_LABEL[resolveInterviewerType(value)];
}

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
