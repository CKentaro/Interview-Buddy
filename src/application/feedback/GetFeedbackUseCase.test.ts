import { describe, expect, it, vi } from "vitest";

import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import type { IFeedbackSessionReader } from "@/domain/feedback/ports/IFeedbackSessionReader";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { FEEDBACK_TIMEOUT_MS } from "@/domain/feedback/services/determineFeedbackStatus";
import { GetFeedbackUseCase } from "./GetFeedbackUseCase";
import { SessionNotFoundError } from "./errors";

const endedAt = new Date("2026-07-01T00:00:00.000Z");

const feedback: Feedback = {
  id: "fb-1",
  overallComment: "総評",
  sessionId: "sess-1",
  axisFeedbacks: [
    { id: "af-1", axis: EvaluationAxis.REPRODUCIBILITY, comment: "再現性の講評" },
  ],
};

function createReader(
  state: { endedAt: Date | null } | null,
): IFeedbackSessionReader {
  return { findOwnedSessionState: vi.fn().mockResolvedValue(state) };
}

function createFeedbackRepo(value: Feedback | null): IFeedbackRepository {
  return {
    findBySessionId: vi.fn().mockResolvedValue(value),
    save: vi.fn(),
  };
}

describe("GetFeedbackUseCase", () => {
  it("非所有／非存在（reader が null）→ SessionNotFoundError", async () => {
    const useCase = new GetFeedbackUseCase(
      createReader(null),
      createFeedbackRepo(null),
    );
    await expect(useCase.execute("user-1", "sess-1")).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });

  it("Feedback あり → completed（詳細を返す）", async () => {
    const useCase = new GetFeedbackUseCase(
      createReader({ endedAt }),
      createFeedbackRepo(feedback),
    );
    await expect(useCase.execute("user-1", "sess-1")).resolves.toEqual({
      status: "completed",
      feedback,
    });
  });

  it("Feedback 無し・面接未終了 → generating", async () => {
    const useCase = new GetFeedbackUseCase(
      createReader({ endedAt: null }),
      createFeedbackRepo(null),
    );
    await expect(useCase.execute("user-1", "sess-1")).resolves.toEqual({
      status: "generating",
    });
  });

  it("Feedback 無し・タイムアウト超過 → failed", async () => {
    const now = new Date(endedAt.getTime() + FEEDBACK_TIMEOUT_MS + 1);
    const useCase = new GetFeedbackUseCase(
      createReader({ endedAt }),
      createFeedbackRepo(null),
    );
    await expect(useCase.execute("user-1", "sess-1", now)).resolves.toEqual({
      status: "failed",
    });
  });
});
