import { describe, expect, it, vi } from "vitest";

import { MAX_VOICE_SESSIONS_PER_DAY } from "@/domain/interview/model/voiceRateLimit";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import { GetVoiceSessionQuotaUseCase } from "./GetVoiceSessionQuotaUseCase";

function repositoryWithUsage(used: number): IInterviewSessionRepository {
  return {
    countVoiceUsageSince: vi.fn().mockResolvedValue(used),
  } as unknown as IInterviewSessionRepository;
}

describe("GetVoiceSessionQuotaUseCase", () => {
  it("未使用なら remaining は上限と一致する", async () => {
    const useCase = new GetVoiceSessionQuotaUseCase(repositoryWithUsage(0));

    const quota = await useCase.execute("user-1");

    expect(quota).toEqual({
      limit: MAX_VOICE_SESSIONS_PER_DAY,
      used: 0,
      remaining: MAX_VOICE_SESSIONS_PER_DAY,
    });
  });

  it("枠を使い切っていれば remaining は 0（負にならない）", async () => {
    const useCase = new GetVoiceSessionQuotaUseCase(
      repositoryWithUsage(MAX_VOICE_SESSIONS_PER_DAY + 2),
    );

    const quota = await useCase.execute("user-1");

    expect(quota.remaining).toBe(0);
    expect(quota.used).toBe(MAX_VOICE_SESSIONS_PER_DAY + 2);
  });
});
