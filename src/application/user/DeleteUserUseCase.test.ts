import { describe, expect, it, vi } from "vitest";

import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { DeleteUserUseCase } from "./DeleteUserUseCase";
import { UserNotFoundError } from "./errors";

function createRepository(
  overrides: Partial<IUserRepository> = {},
): IUserRepository {
  return {
    getProfileWithStats: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeleteUserUseCase", () => {
  it("本人 → リポジトリの delete を対象 id で呼ぶ", async () => {
    const repo = createRepository();
    const useCase = new DeleteUserUseCase(repo);

    await expect(useCase.execute("user-1", "user-1")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith("user-1");
  });

  it("非本人（id 不一致）→ UserNotFoundError（delete を呼ばない）", async () => {
    const repo = createRepository();
    const useCase = new DeleteUserUseCase(repo);

    await expect(useCase.execute("user-1", "user-2")).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
