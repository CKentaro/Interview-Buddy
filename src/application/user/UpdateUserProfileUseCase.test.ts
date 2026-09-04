import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/domain/user/model/UserProfile";
import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { UpdateUserProfileUseCase } from "./UpdateUserProfileUseCase";
import { UserNotFoundError } from "./errors";

const profile: UserProfile = {
  id: "user-1",
  name: "テスト太郎",
  email: "taro@example.com",
  image: null,
  careerPreference: { industry: null, job: null },
  onboardingCompleted: true,
  totalSessions: 0,
  lastSessionAt: null,
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

describe("UpdateUserProfileUseCase", () => {
  it("非本人（id 不一致）→ UserNotFoundError（更新しない）", async () => {
    const repo = createRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await expect(
      useCase.execute("user-1", "user-2", { name: "花子" }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    expect(repo.updateProfile).not.toHaveBeenCalled();
  });

  it("表示名は正規化して渡し、更新後のプロフィールを返す", async () => {
    const repo = createRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await expect(
      useCase.execute("user-1", "user-1", { name: "  花子  " }),
    ).resolves.toEqual(profile);
    expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
      name: "花子",
    });
  });

  it("空の表示名 → null（未設定に戻す）", async () => {
    const repo = createRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await useCase.execute("user-1", "user-1", { name: "   " });
    expect(repo.updateProfile).toHaveBeenCalledWith("user-1", { name: null });
  });

  it("志望設定は 4 項目を 1 組として扱う（片方だけの指定は他方を未設定にする）", async () => {
    const repo = createRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await useCase.execute("user-1", "user-1", {
      industryMajor: "IT・インターネット",
      industryMinor: "ゲーム",
    });
    expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
      careerPreference: {
        industry: { major: "IT・インターネット", minor: "ゲーム" },
        job: null,
      },
    });
  });

  it("志望設定に触れない更新 → careerPreference を渡さない（既存値を残す）", async () => {
    const repo = createRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await useCase.execute("user-1", "user-1", { completeOnboarding: true });
    expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
      completeOnboarding: true,
    });
  });

  it("更新対象が存在しない → UserNotFoundError", async () => {
    const repo = createRepository({
      updateProfile: vi.fn().mockResolvedValue(false),
    });
    const useCase = new UpdateUserProfileUseCase(repo);

    await expect(
      useCase.execute("user-1", "user-1", { name: "花子" }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
    expect(repo.getProfileWithStats).not.toHaveBeenCalled();
  });
});
