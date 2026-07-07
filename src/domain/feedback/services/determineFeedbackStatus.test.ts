import { describe, expect, it } from "vitest";

import {
  determineFeedbackStatus,
  FEEDBACK_TIMEOUT_MS,
} from "./determineFeedbackStatus";

const endedAt = new Date("2026-07-01T00:00:00.000Z");

describe("determineFeedbackStatus", () => {
  it("Feedback があれば endedAt/経過時間に関わらず completed", () => {
    expect(determineFeedbackStatus(true, null, new Date())).toBe("completed");
    expect(determineFeedbackStatus(true, endedAt, new Date("2100-01-01"))).toBe(
      "completed",
    );
  });

  it("Feedback 無し・面接未終了（endedAt=null）→ generating", () => {
    expect(determineFeedbackStatus(false, null, new Date())).toBe("generating");
  });

  it("Feedback 無し・終了直後（タイムアウト未満）→ generating", () => {
    const now = new Date(endedAt.getTime() + FEEDBACK_TIMEOUT_MS - 1);
    expect(determineFeedbackStatus(false, endedAt, now)).toBe("generating");
  });

  it("Feedback 無し・タイムアウト境界ちょうど → failed", () => {
    const now = new Date(endedAt.getTime() + FEEDBACK_TIMEOUT_MS);
    expect(determineFeedbackStatus(false, endedAt, now)).toBe("failed");
  });

  it("Feedback 無し・タイムアウト超過 → failed", () => {
    const now = new Date(endedAt.getTime() + FEEDBACK_TIMEOUT_MS + 60_000);
    expect(determineFeedbackStatus(false, endedAt, now)).toBe("failed");
  });
});
