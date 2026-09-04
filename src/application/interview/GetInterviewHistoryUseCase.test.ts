import { describe, expect, it, vi } from "vitest";

import type {
  IInterviewSessionRepository,
  SessionSummary,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { GetInterviewHistoryUseCase } from "./GetInterviewHistoryUseCase";

const summaries: SessionSummary[] = [
  {
    id: "sess-2",
    startedAt: new Date("2026-07-02T00:00:00.000Z"),
    endedAt: new Date("2026-07-02T01:00:00.000Z"),
    companyName: "B社",
    industryMajor: null,
    industryMinor: null,
    jobMajor: null,
    jobMinor: null,
    selectionStage: null,
    interviewerType: null,
    companyId: null,
    questionCount: 5,
    hasFeedback: true,
  },
];

describe("GetInterviewHistoryUseCase", () => {
  it("リポジトリの完了済み一覧を userId スコープで取得して返す", async () => {
    const repo = {
      findCompletedByUser: vi.fn().mockResolvedValue(summaries),
    } as unknown as IInterviewSessionRepository;
    const useCase = new GetInterviewHistoryUseCase(repo);

    await expect(useCase.execute("user-1")).resolves.toEqual(summaries);
    expect(repo.findCompletedByUser).toHaveBeenCalledWith("user-1");
  });
});
