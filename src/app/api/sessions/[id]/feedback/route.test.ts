import { beforeEach, describe, expect, it, vi } from "vitest";

// auth-guard を丸ごとモック（実物は next-auth を読み込みテスト環境で解決できない）。
// Prisma アダプタもスタブ化し、UseCase / presenter 本体は実物を通す。
const {
  requireUser,
  UnauthorizedError,
  findOwnedSessionState,
  findBySessionId,
} = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }
  return {
    requireUser: vi.fn<() => Promise<string>>(),
    UnauthorizedError,
    findOwnedSessionState: vi.fn(),
    findBySessionId: vi.fn(),
  };
});

vi.mock("@/lib/auth-guard", () => ({ requireUser, UnauthorizedError }));
vi.mock("@/infrastructure/prisma/PrismaFeedbackSessionReader", () => ({
  PrismaFeedbackSessionReader: vi.fn(function PrismaFeedbackSessionReader() {
    return { findOwnedSessionState };
  }),
}));
vi.mock("@/infrastructure/prisma/PrismaFeedbackRepository", () => ({
  PrismaFeedbackRepository: vi.fn(function PrismaFeedbackRepository() {
    return { findBySessionId, save: vi.fn() };
  }),
}));

import { GET } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/sessions/[id]/feedback", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(401);
  });

  it("非所有（reader が null）→ 404（Feedback 詳細を返さない）", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue(null);
    findBySessionId.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(404);
  });

  it("Feedback 無し・未終了 → 200 generating", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue({ endedAt: null });
    findBySessionId.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "generating" });
  });

  it("Feedback あり → 200 completed（axisLabel 付きで整形）", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue({
      endedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    findBySessionId.mockResolvedValue({
      id: "fb-1",
      overallComment: "総評",
      sessionId: "sess-1",
      axisFeedbacks: [
        { id: "af-1", axis: "REPRODUCIBILITY", comment: "再現性の講評" },
      ],
    });

    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "総評",
      axisFeedbacks: [
        { axis: "REPRODUCIBILITY", axisLabel: "再現性", comment: "再現性の講評" },
      ],
    });
  });
});
