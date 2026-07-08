import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUser,
  UnauthorizedError,
  deleteOwnedSession,
  findDetailById,
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
    deleteOwnedSession: vi.fn(),
    findDetailById: vi.fn(),
    findBySessionId: vi.fn(),
  };
});

vi.mock("@/lib/auth-guard", () => ({ requireUser, UnauthorizedError }));
vi.mock("@/infrastructure/prisma/PrismaInterviewSessionRepository", () => ({
  PrismaInterviewSessionRepository: vi.fn(
    function PrismaInterviewSessionRepository() {
      return { deleteOwnedSession, findDetailById };
    },
  ),
}));
vi.mock("@/infrastructure/prisma/PrismaFeedbackRepository", () => ({
  PrismaFeedbackRepository: vi.fn(function PrismaFeedbackRepository() {
    return { findBySessionId, save: vi.fn() };
  }),
}));

import { DELETE, GET } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

const detail = {
  id: "sess-1",
  startedAt: new Date("2026-06-30T00:00:00.000Z"),
  endedAt: new Date("2026-07-01T00:00:00.000Z"),
  companyName: "Example Inc.",
  industryMajor: null,
  industryMinor: null,
  jobMajor: null,
  jobMinor: null,
  selectionStage: null,
  interviewerType: null,
  questions: [
    {
      id: "q-1",
      type: "MAIN",
      content: "Q1",
      displayOrder: 1,
      primaryAxis: "REPRODUCIBILITY",
      parentQuestionId: null,
      answer: { id: "a-1", content: "A1" },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/sessions/[id]", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await DELETE(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(401);
  });

  it("所有・削除成功 → 204", async () => {
    requireUser.mockResolvedValue("user-1");
    deleteOwnedSession.mockResolvedValue(true);
    const res = await DELETE(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(204);
    expect(deleteOwnedSession).toHaveBeenCalledWith("user-1", "sess-1");
  });

  it("非存在・非所有 → 404", async () => {
    requireUser.mockResolvedValue("user-1");
    deleteOwnedSession.mockResolvedValue(false);
    const res = await DELETE(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/sessions/[id]", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(401);
  });

  it("非所有 → 404", async () => {
    requireUser.mockResolvedValue("user-1");
    findDetailById.mockResolvedValue(null);
    findBySessionId.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(404);
  });

  it("Feedback あり → 200（Q&A 整形＋feedback completed 埋め込み）", async () => {
    requireUser.mockResolvedValue("user-1");
    findDetailById.mockResolvedValue(detail);
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
    const body = await res.json();
    expect(body.id).toBe("sess-1");
    expect(body.startedAt).toBe("2026-06-30T00:00:00.000Z");
    expect(body.questions).toEqual([
      {
        id: "q-1",
        type: "MAIN",
        content: "Q1",
        displayOrder: 1,
        primaryAxis: "REPRODUCIBILITY",
        parentQuestionId: null,
        answer: { id: "a-1", content: "A1" },
      },
    ]);
    expect(body.feedback).toEqual({
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "総評",
      axisFeedbacks: [
        { axis: "REPRODUCIBILITY", axisLabel: "再現性", comment: "再現性の講評" },
      ],
    });
  });

  it("Feedback 無し・未終了 → 200（feedback generating）", async () => {
    requireUser.mockResolvedValue("user-1");
    findDetailById.mockResolvedValue({ ...detail, endedAt: null });
    findBySessionId.mockResolvedValue(null);
    const res = await GET(new Request("http://x"), ctx("sess-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).feedback).toEqual({ status: "generating" });
  });
});
