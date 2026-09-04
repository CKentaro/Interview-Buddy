import { describe, expect, it, vi } from "vitest";

import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import { FEEDBACK_TIMEOUT_MS } from "@/domain/feedback/services/determineFeedbackStatus";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import type {
  IInterviewSessionRepository,
  InterviewSessionDetail,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { GetInterviewSessionDetailUseCase } from "./GetInterviewSessionDetailUseCase";
import { SessionNotFoundError } from "./errors";

const endedAt = new Date("2026-07-01T00:00:00.000Z");

function detail(overrides: Partial<InterviewSessionDetail> = {}): InterviewSessionDetail {
  return {
    id: "sess-1",
    startedAt: new Date("2026-06-30T00:00:00.000Z"),
    endedAt,
    companyName: null,
    industryMajor: null,
    industryMinor: null,
    jobMajor: null,
    jobMinor: null,
    selectionStage: null,
    interviewerType: null,
    companyId: null,
    interviewLength: InterviewLength.STANDARD,
    voiceEnabled: false,
    questions: [
      {
        id: "q-1",
        type: QuestionType.MAIN,
        content: "Q1",
        displayOrder: 1,
        primaryAxis: EvaluationAxis.REPRODUCIBILITY,
        parentQuestionId: null,
        answer: { id: "a-1", content: "A1" },
      },
    ],
    ...overrides,
  };
}

const feedback: Feedback = {
  id: "fb-1",
  overallComment: "総評",
  sessionId: "sess-1",
  axisFeedbacks: [],
};

function createSessionRepo(value: InterviewSessionDetail | null): IInterviewSessionRepository {
  return {
    findDetailById: vi.fn().mockResolvedValue(value),
  } as unknown as IInterviewSessionRepository;
}

function createFeedbackRepo(value: Feedback | null): IFeedbackRepository {
  return { findBySessionId: vi.fn().mockResolvedValue(value), save: vi.fn() };
}

describe("GetInterviewSessionDetailUseCase", () => {
  it("非存在／非所有（detail が null）→ SessionNotFoundError", async () => {
    const useCase = new GetInterviewSessionDetailUseCase(
      createSessionRepo(null),
      createFeedbackRepo(null),
    );
    await expect(useCase.execute("user-1", "sess-1")).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });

  it("Feedback あり → feedback.status=completed で埋め込む", async () => {
    const useCase = new GetInterviewSessionDetailUseCase(
      createSessionRepo(detail()),
      createFeedbackRepo(feedback),
    );
    const result = await useCase.execute("user-1", "sess-1");
    expect(result.detail.id).toBe("sess-1");
    expect(result.feedback).toEqual({ status: "completed", feedback });
  });

  it("Feedback 無し・面接未終了 → generating", async () => {
    const useCase = new GetInterviewSessionDetailUseCase(
      createSessionRepo(detail({ endedAt: null })),
      createFeedbackRepo(null),
    );
    const result = await useCase.execute("user-1", "sess-1");
    expect(result.feedback).toEqual({ status: "generating" });
  });

  it("Feedback 無し・タイムアウト超過 → failed", async () => {
    const now = new Date(endedAt.getTime() + FEEDBACK_TIMEOUT_MS + 1);
    const useCase = new GetInterviewSessionDetailUseCase(
      createSessionRepo(detail()),
      createFeedbackRepo(null),
    );
    const result = await useCase.execute("user-1", "sess-1", now);
    expect(result.feedback).toEqual({ status: "failed" });
  });
});
