import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUser,
  UnauthorizedError,
  findOwnedSessionState,
  findBySessionId,
  after,
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
    after: vi.fn(),
  };
});

vi.mock("next/server", () => ({ after }));
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
// 生成本体の依存はスタブ化（after はモックで実行されないため中身は呼ばれない）。
vi.mock("@/infrastructure/prisma/PrismaFeedbackContextProvider", () => ({
  PrismaFeedbackContextProvider: vi.fn(function PrismaFeedbackContextProvider() {
    return { loadQARows: vi.fn() };
  }),
}));
vi.mock("@/infrastructure/ai/GeminiFeedbackService", () => ({
  GeminiFeedbackService: vi.fn(function GeminiFeedbackService() {
    return { generate: vi.fn() };
  }),
}));

import { POST } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const endedAt = new Date("2026-07-01T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/sessions/[id]/feedback/generate", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await POST(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(401);
  });

  it("非所有・非存在 → 404（生成をスケジュールしない）", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(404);
    expect(after).not.toHaveBeenCalled();
  });

  it("面接未完了（endedAt=null）→ 409", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue({ endedAt: null });
    const res = await POST(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(409);
    expect(after).not.toHaveBeenCalled();
  });

  it("既に Feedback あり → 200（生成をスケジュールしない）", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue({ endedAt });
    findBySessionId.mockResolvedValue({ id: "fb-1" });
    const res = await POST(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(200);
    expect(after).not.toHaveBeenCalled();
  });

  it("完了・未生成 → 202（生成を after でスケジュール）", async () => {
    requireUser.mockResolvedValue("user-1");
    findOwnedSessionState.mockResolvedValue({ endedAt });
    findBySessionId.mockResolvedValue(null);
    const res = await POST(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(202);
    expect(after).toHaveBeenCalledOnce();
  });
});
