import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/domain/user/model/UserProfile";
import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { GetUserUseCase } from "./GetUserUseCase";
import { UserNotFoundError } from "./errors";

const profile: UserProfile = {
  id: "user-1",
  name: "テスト太郎",
  email: "taro@example.com",
  image: null,
  careerPreference: {
    industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
    job: null,
  },
  onboardingCompleted: true,
  totalSessions: 3,
  lastSessionAt: new Date("2026-07-01T00:00:00.000Z"),
};

function createRepository(
  overrides: Partial<IUserRepository> = {},
): IUserRepository {
  return {
    getProfileWithStats: vi.fn().mockResolvedValue(profile),
    isOnboardingCompleted: vi.fn().mockResolvedValue(true),
    updateProfile: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GetUserUseCase", () => {
  it("本人 かつ 存在する → プロフィールを返す", async () => {
    const repo = createRepository();
    const useCase = new GetUserUseCase(repo);

    await expect(useCase.execute("user-1", "user-1")).resolves.toEqual(profile);
    expect(repo.getProfileWithStats).toHaveBeenCalledWith("user-1");
  });

  it("非本人（id 不一致）→ UserNotFoundError（リポジトリを呼ばない）", async () => {
    const repo = createRepository();
    const useCase = new GetUserUseCase(repo);

    await expect(useCase.execute("user-1", "user-2")).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
    expect(repo.getProfileWithStats).not.toHaveBeenCalled();
  });

  it("本人 だが 存在しない（null）→ UserNotFoundError", async () => {
    const repo = createRepository({
      getProfileWithStats: vi.fn().mockResolvedValue(null),
    });
    const useCase = new GetUserUseCase(repo);

    await expect(useCase.execute("user-1", "user-1")).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});
