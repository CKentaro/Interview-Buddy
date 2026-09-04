import { describe, expect, it, vi } from "vitest";

import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { GetOnboardingStatusUseCase } from "./GetOnboardingStatusUseCase";

function createRepository(
  isOnboardingCompleted: IUserRepository["isOnboardingCompleted"],
): IUserRepository {
  return {
    getProfileWithStats: vi.fn().mockResolvedValue(null),
    isOnboardingCompleted,
    updateProfile: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("GetOnboardingStatusUseCase", () => {
  it("未完了 → false（オンボーディングへ誘導する）", async () => {
    const useCase = new GetOnboardingStatusUseCase(
      createRepository(vi.fn().mockResolvedValue(false)),
    );
    await expect(useCase.execute("user-1")).resolves.toBe(false);
  });

  it("完了済み → true", async () => {
    const useCase = new GetOnboardingStatusUseCase(
      createRepository(vi.fn().mockResolvedValue(true)),
    );
    await expect(useCase.execute("user-1")).resolves.toBe(true);
  });

  it("ユーザーが存在しない → true（誘導先で行き止まりにしない）", async () => {
    const useCase = new GetOnboardingStatusUseCase(
      createRepository(vi.fn().mockResolvedValue(null)),
    );
    await expect(useCase.execute("user-1")).resolves.toBe(true);
  });
});
