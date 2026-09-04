import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import { SessionStatus } from "@/domain/interview/model/SessionStatus.vo";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import { POST as pausePost } from "./[id]/pause/route";
import { POST as resumePost } from "./[id]/resume/route";
import { GET as resumableGet } from "./resumable/route";

const routeMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    requireUser: vi.fn<() => Promise<string>>(),
    pauseResult: "PAUSED" as "PAUSED" | "COMPLETED" | null,
    resumeResult: undefined as unknown,
    pausedSessions: [] as unknown[],
  };
});

vi.mock("@/lib/auth-guard", () => ({
  UnauthorizedError: routeMocks.UnauthorizedError,
  requireUser: routeMocks.requireUser,
}));

vi.mock("@/infrastructure/prisma/PrismaInterviewSessionRepository", () => ({
  PrismaInterviewSessionRepository: class PrismaInterviewSessionRepository {
    async pauseOwnedSession(): Promise<unknown> {
      return routeMocks.pauseResult;
    }

    async resumeOwnedSession(): Promise<unknown> {
      return routeMocks.resumeResult;
    }

    async findPausedByUser(): Promise<unknown[]> {
      return routeMocks.pausedSessions;
    }
  },
}));

const context = { params: Promise.resolve({ id: "session-1" }) };
const request = new Request("http://localhost/api/sessions/session-1", {
  method: "POST",
});

function resumeState(status: SessionStatus = SessionStatus.IN_PROGRESS) {
  return {
    session: {
      id: "session-1",
      userId: "user-1",
      startedAt: new Date("2026-09-01T00:00:00.000Z"),
      endedAt: status === SessionStatus.COMPLETED ? new Date() : null,
      status,
      voiceEnabled: true,
      interviewLength: InterviewLength.STANDARD,
      companyName: null,
      industryMajor: null,
      industryMinor: null,
      jobMajor: null,
      jobMinor: null,
      selectionStage: null,
      interviewerType: "friendly",
      questions: [],
    },
    questions: [
      {
        id: "main-1",
        type: QuestionType.MAIN,
        content: "質問です",
        displayOrder: 1,
        primaryAxis: null,
        parentQuestionId: null,
        answer: null,
      },
      ...[2, 3, 4].map((displayOrder) => ({
        id: `main-${displayOrder}`,
        type: QuestionType.MAIN,
        content: `質問${displayOrder}`,
        displayOrder,
        primaryAxis: null,
        parentQuestionId: null,
        answer: null,
      })),
    ],
  };
}

beforeEach(() => {
  routeMocks.requireUser.mockReset();
  routeMocks.requireUser.mockResolvedValue("user-1");
  routeMocks.pauseResult = "PAUSED";
  routeMocks.resumeResult = resumeState();
  routeMocks.pausedSessions = [];
});

describe("POST /api/sessions/[id]/pause", () => {
  it("中断状態を 200 で返す", async () => {
    const response = await pausePost(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessionId: "session-1",
      status: "PAUSED",
    });
  });

  it("完了済みは 409", async () => {
    routeMocks.pauseResult = "COMPLETED";

    const response = await pausePost(request, context);

    expect(response.status).toBe(409);
  });
});

describe("POST /api/sessions/[id]/resume", () => {
  it("DBから復元した質問・進捗・音声設定を返す", async () => {
    const response = await resumePost(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessionId: "session-1",
      status: "IN_PROGRESS",
      voiceEnabled: true,
      interviewerType: "friendly",
      interviewLength: InterviewLength.STANDARD,
      totalQuestionCount: 12,
      questionNumber: 1,
      currentQuestion: {
        id: "main-1",
        type: "MAIN",
        text: "質問です",
        speechText: "質問です",
        parentQuestionId: null,
      },
    });
  });

  it("未認証は 401", async () => {
    routeMocks.requireUser.mockRejectedValue(
      new routeMocks.UnauthorizedError(),
    );

    const response = await resumePost(request, context);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/sessions/resumable", () => {
  it("中断中セッションを DTO で返す", async () => {
    routeMocks.pausedSessions = [
      {
        id: "session-1",
        startedAt: new Date("2026-09-01T00:00:00.000Z"),
        companyName: "Example Inc.",
        industryMajor: null,
        industryMinor: null,
        jobMajor: "Engineer",
        jobMinor: null,
        selectionStage: "first",
        interviewerType: "friendly",
        answeredQuestionCount: 2,
      },
    ];

    const response = await resumableGet();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: [
        {
          id: "session-1",
          startedAt: "2026-09-01T00:00:00.000Z",
          companyName: "Example Inc.",
          industryMajor: null,
          industryMinor: null,
          jobMajor: "Engineer",
          jobMinor: null,
          selectionStage: "first",
          interviewerType: "friendly",
          answeredQuestionCount: 2,
        },
      ],
    });
  });
});
