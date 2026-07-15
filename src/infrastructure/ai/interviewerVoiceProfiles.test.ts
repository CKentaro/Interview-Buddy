import { describe, expect, it } from "vitest";

import { getInterviewerVoiceProfile } from "./interviewerVoiceProfiles";

describe("getInterviewerVoiceProfile", () => {
  it.each([
    ["friendly", "Sulafat"],
    ["neutral", "Schedar"],
    ["strict", "Gacrux"],
  ] as const)("%s に %s を割り当てる", (interviewerType, voiceName) => {
    expect(getInterviewerVoiceProfile(interviewerType).voiceName).toBe(
      voiceName,
    );
  });

  it("未設定値はニュートラルへフォールバックする", () => {
    expect(getInterviewerVoiceProfile(null)).toEqual(
      getInterviewerVoiceProfile("neutral"),
    );
  });
});
