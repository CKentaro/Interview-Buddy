import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import type { InterviewLength as PrismaInterviewLength } from "@/generated/prisma/enums";

export const INTERVIEW_LENGTH_TO_DOMAIN: Record<
  PrismaInterviewLength,
  InterviewLength
> = {
  SHORT: InterviewLength.SHORT,
  STANDARD: InterviewLength.STANDARD,
  LONG: InterviewLength.LONG,
};

export const INTERVIEW_LENGTH_TO_PRISMA: Record<
  InterviewLength,
  PrismaInterviewLength
> = {
  [InterviewLength.SHORT]: "SHORT",
  [InterviewLength.STANDARD]: "STANDARD",
  [InterviewLength.LONG]: "LONG",
};
