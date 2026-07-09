import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import type {
  SessionQuestionWithAnswer,
  SessionSummary,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { QuestionType as PrismaQuestionType } from "@/generated/prisma/enums";
import { AXIS_TO_PRISMA } from "@/infrastructure/prisma/evaluationAxisMapping";
import type { QuestionWithAnswer, SessionListItemResponse } from "./types";

/** ドメインの QuestionType → Prisma enum（値は同一だが型を明示的に橋渡し）。 */
const TYPE_TO_PRISMA: Record<QuestionType, PrismaQuestionType> = {
  [QuestionType.MAIN]: PrismaQuestionType.MAIN,
  [QuestionType.FOLLOW_UP]: PrismaQuestionType.FOLLOW_UP,
};

/** ドメインの QuestionType を DTO（Prisma enum）へ変換する共有ヘルパ。 */
export function toApiQuestionType(type: QuestionType): PrismaQuestionType {
  return TYPE_TO_PRISMA[type];
}

/** ドメインの Q&A を DTO の QuestionWithAnswer に詰め替える（enum を Prisma 側へ変換）。 */
export function toQuestionWithAnswer(
  q: SessionQuestionWithAnswer,
): QuestionWithAnswer {
  return {
    id: q.id,
    type: TYPE_TO_PRISMA[q.type],
    content: q.content,
    displayOrder: q.displayOrder,
    primaryAxis: q.primaryAxis === null ? null : AXIS_TO_PRISMA[q.primaryAxis],
    parentQuestionId: q.parentQuestionId,
    answer: q.answer,
  };
}

/** 履歴サマリを DTO の SessionListItemResponse に詰め替える（日時を ISO 文字列へ）。 */
export function toSessionListItem(s: SessionSummary): SessionListItemResponse {
  return {
    id: s.id,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
    companyName: s.companyName,
    industryMajor: s.industryMajor,
    industryMinor: s.industryMinor,
    jobMajor: s.jobMajor,
    jobMinor: s.jobMinor,
    selectionStage: s.selectionStage,
    interviewerType: s.interviewerType,
    questionCount: s.questionCount,
    hasFeedback: s.hasFeedback,
  };
}
