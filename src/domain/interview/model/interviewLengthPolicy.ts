import { InterviewLength, resolveInterviewLength } from "./InterviewLength.vo";
import {
  MAIN_QUESTION_AXIS_PLAN,
  LONG_MAIN_QUESTION_AXIS_PLAN,
  SHORT_MAIN_QUESTION_AXIS_PLAN,
  type MainQuestionPlanEntry,
} from "./mainQuestionPlan";

export type InterviewLengthPolicy = {
  mainQuestionPlan: readonly MainQuestionPlanEntry[];
  maxFollowUpDepth: number;
};

/** 長さごとの固定出題ポリシー。不足判定による質問数の増減は行わない。 */
export const INTERVIEW_LENGTH_POLICY: Record<
  InterviewLength,
  InterviewLengthPolicy
> = {
  [InterviewLength.SHORT]: {
    mainQuestionPlan: SHORT_MAIN_QUESTION_AXIS_PLAN,
    maxFollowUpDepth: 1,
  },
  [InterviewLength.STANDARD]: {
    mainQuestionPlan: MAIN_QUESTION_AXIS_PLAN,
    maxFollowUpDepth: 2,
  },
  [InterviewLength.LONG]: {
    mainQuestionPlan: LONG_MAIN_QUESTION_AXIS_PLAN,
    maxFollowUpDepth: 2,
  },
};

export function getInterviewLengthPolicy(
  length: InterviewLength | string | null | undefined,
): InterviewLengthPolicy {
  return INTERVIEW_LENGTH_POLICY[resolveInterviewLength(length)];
}

export function getTotalQuestionCount(
  length: InterviewLength | string | null | undefined,
  mainQuestionCount?: number,
): number {
  const policy = getInterviewLengthPolicy(length);
  return (
    (mainQuestionCount ?? policy.mainQuestionPlan.length) *
    (1 + policy.maxFollowUpDepth)
  );
}
