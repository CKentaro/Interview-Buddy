import { describe, expect, it, vi } from "vitest";

import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import { DeleteInterviewSessionUseCase } from "./DeleteInterviewSessionUseCase";
import { SessionNotFoundError } from "./errors";

function createRepository(deleted: boolean): IInterviewSessionRepository {
  return {
    deleteOwnedSession: vi.fn().mockResolvedValue(deleted),
  } as unknown as IInterviewSessionRepository;
}

describe("DeleteInterviewSessionUseCase", () => {
  it("削除できた → 正常終了し、userId スコープで削除を呼ぶ", async () => {
    const repo = createRepository(true);
    const useCase = new DeleteInterviewSessionUseCase(repo);

    await expect(useCase.execute("user-1", "sess-1")).resolves.toBeUndefined();
    expect(repo.deleteOwnedSession).toHaveBeenCalledWith("user-1", "sess-1");
  });

  it("削除件数 0（非存在・非所有）→ SessionNotFoundError", async () => {
    const useCase = new DeleteInterviewSessionUseCase(createRepository(false));

    await expect(useCase.execute("user-1", "sess-1")).rejects.toBeInstanceOf(
      SessionNotFoundError,
    );
  });
});
