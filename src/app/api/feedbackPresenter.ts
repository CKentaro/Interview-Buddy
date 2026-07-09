import type { AxisFeedback } from "@/domain/feedback/model/AxisFeedback.entity";
import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import { EVALUATION_AXIS_METADATA } from "@/domain/interview/model/evaluationAxisMetadata";
import { AXIS_TO_PRISMA } from "@/infrastructure/prisma/evaluationAxisMapping";
import type { AxisFeedbackResult, FeedbackResponse } from "./types";

/** UseCase が返す feedback の status（completed のときのみ本体を持つ）。 */
export type FeedbackStatusResult =
  | { status: "generating" | "failed" }
  | { status: "completed"; feedback: Feedback };

/** ドメインの AxisFeedback[] を DTO の AxisFeedbackResult[] に詰め替える（軸→Prisma enum＋ラベル）。 */
export function toAxisFeedbackResults(
  axisFeedbacks: AxisFeedback[],
): AxisFeedbackResult[] {
  return axisFeedbacks.map((a) => ({
    axis: AXIS_TO_PRISMA[a.axis],
    axisLabel: EVALUATION_AXIS_METADATA[a.axis].label,
    comment: a.comment,
  }));
}

/**
 * UseCase の feedback 結果を DTO の FeedbackResponse（判別可能ユニオン）に詰め替える。
 * GET /feedback（3-4）と GET /sessions/[id]（3-9）で共有する。
 */
export function toFeedbackResponse(
  result: FeedbackStatusResult,
): FeedbackResponse {
  if (result.status === "completed") {
    return {
      status: "completed",
      feedbackId: result.feedback.id,
      overallComment: result.feedback.overallComment,
      axisFeedbacks: toAxisFeedbackResults(result.feedback.axisFeedbacks),
    };
  }
  return { status: result.status };
}
