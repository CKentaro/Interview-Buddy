import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import type { BankAxis, QuestionBank } from "@/domain/interview/model/QuestionBank.vo";
import type {
  CreateSessionInput,
  SessionSummary,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { GET, POST } from "./route";

const routeMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    bank: undefined as unknown,
    createSessionInputs: [] as CreateSessionInput[],
    completedSessions: [] as SessionSummary[],
    voiceQuotaConsumable: true,
    requireUser: vi.fn<() => Promise<string>>(),
  };
});

vi.mock("@/lib/auth-guard", () => ({
  UnauthorizedError: routeMocks.UnauthorizedError,
  requireUser: routeMocks.requireUser,
}));

vi.mock("@/infrastructure/questionBank/JsonQuestionBankProvider", () => ({
  JsonQuestionBankProvider: class JsonQuestionBankProvider {
    load(): unknown {
      return routeMocks.bank;
    }
  },
}));

vi.mock("@/infrastructure/prisma/PrismaInterviewSessionRepository", () => ({
  PrismaInterviewSessionRepository: class PrismaInterviewSessionRepository {
    async createSession(input: CreateSessionInput): Promise<unknown> {
      routeMocks.createSessionInputs.push(input);
      const firstSelected = input.selectedQuestions.find(
        (question) => question.displayOrder === 1,
      );
      if (!firstSelected) {
        throw new Error("No first question");
      }

      return {
        session: {
          id: "session-1",
          userId: input.userId,
          startedAt: new Date("2026-07-07T00:00:00.000Z"),
          endedAt: null,
          status: "IN_PROGRESS",
          voiceEnabled: input.voiceEnabled ?? false,
          interviewLength: input.interviewLength,
          companyName: input.companyName ?? null,
          industryMajor: input.industryMajor ?? null,
          industryMinor: input.industryMinor ?? null,
          jobMajor: input.jobMajor ?? null,
          jobMinor: input.jobMinor ?? null,
          selectionStage: input.selectionStage ?? null,
          interviewerType: input.interviewerType ?? null,
          questions: [],
        },
        firstQuestion: {
          id: "question-1",
          type: "MAIN",
          content: firstSelected.displayText,
          displayOrder: firstSelected.displayOrder,
          depthCount: 0,
          primaryAxis: firstSelected.axis,
          parentQuestionId: null,
        },
      };
    }

    async tryConsumeVoiceQuota(): Promise<boolean> {
      return routeMocks.voiceQuotaConsumable;
    }

    async findCompletedByUser(): Promise<SessionSummary[]> {
      return routeMocks.completedSessions;
    }
  },
}));

function axis(axisValue: EvaluationAxis, n: number): BankAxis {
  return {
    axis: axisValue,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${axisValue}-${i}`,
      displayText: `${axisValue} 質問 ${i}`,
    })),
  };
}

function createBank(): QuestionBank {
  return {
    values: axis(EvaluationAxis.VALUES_JUDGMENT, 3),
    reproducibility: axis(EvaluationAxis.REPRODUCIBILITY, 3),
    selfAwareness: axis(EvaluationAxis.SELF_AWARENESS, 3),
    worldview: axis(EvaluationAxis.WORLDVIEW, 3),
  };
}

function postRequest(body: string): Request {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/sessions", () => {
  beforeEach(() => {
    routeMocks.bank = createBank();
    routeMocks.createSessionInputs.length = 0;
    routeMocks.voiceQuotaConsumable = true;
    routeMocks.requireUser.mockReset();
    routeMocks.requireUser.mockResolvedValue("user-1");
  });

  it("未認証なら 401 を返す", async () => {
    routeMocks.requireUser.mockRejectedValue(
      new routeMocks.UnauthorizedError(),
    );

    const response = await POST(postRequest("{}"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("不正 JSON なら 400 を返す", async () => {
    const response = await POST(postRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("バリデーションエラーなら 400 を返す", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ voiceEnabled: "true" })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Bad Request",
    });
  });

  it("未対応の面接官タイプなら400を返す", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ interviewerType: "unknown" })),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.createSessionInputs).toHaveLength(0);
  });

  it("未対応の面接の長さなら400を返す", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ interviewLength: "UNKNOWN" })),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.createSessionInputs).toHaveLength(0);
  });

  it("セッションを作成し、最初の質問を 201 で返す", async () => {
    const response = await POST(
      postRequest(
        JSON.stringify({
          jobMajor: "Web Engineer",
          companyName: "Example Inc.",
          voiceEnabled: false,
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createSessionInputs).toHaveLength(1);
    expect(routeMocks.createSessionInputs[0]?.userId).toBe("user-1");
    expect(routeMocks.createSessionInputs[0]?.selectedQuestions).toHaveLength(4);
    expect(
      routeMocks.createSessionInputs[0]?.selectedQuestions.map(
        (question) => question.displayOrder,
      ),
    ).toEqual([1, 2, 3, 4]);

    await expect(response.json()).resolves.toEqual({
      sessionId: "session-1",
      createdAt: "2026-07-07T00:00:00.000Z",
      interviewLength: InterviewLength.STANDARD,
      totalQuestionCount: 12,
      voiceEnabled: false,
      questionsGeneratedFromJobPosting: false,
      firstQuestion: {
        id: "question-1",
        type: "MAIN",
        text: expect.any(String),
        speechText: expect.any(String),
        parentQuestionId: null,
      },
    });
  });

  it("短めなら本質問4問・総質問数8問で作成する", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ interviewLength: InterviewLength.SHORT })),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createSessionInputs[0]?.interviewLength).toBe(
      InterviewLength.SHORT,
    );
    expect(routeMocks.createSessionInputs[0]?.selectedQuestions).toHaveLength(4);
    await expect(response.json()).resolves.toMatchObject({
      interviewLength: InterviewLength.SHORT,
      totalQuestionCount: 8,
    });
  });

  it("長めなら本質問6問・総質問数18問で作成する", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ interviewLength: InterviewLength.LONG })),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createSessionInputs[0]?.selectedQuestions).toHaveLength(6);
    await expect(response.json()).resolves.toMatchObject({
      interviewLength: InterviewLength.LONG,
      totalQuestionCount: 18,
    });
  });

  it("音声要求でも枠を消費できなければ voiceEnabled=false で作成する", async () => {
    routeMocks.voiceQuotaConsumable = false;

    const response = await POST(
      postRequest(
        JSON.stringify({ companyName: "Example Inc.", voiceEnabled: true }),
      ),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createSessionInputs[0]?.voiceEnabled).toBe(false);
    await expect(response.json()).resolves.toMatchObject({
      voiceEnabled: false,
    });
  });
});

describe("GET /api/sessions", () => {
  beforeEach(() => {
    routeMocks.completedSessions = [];
    routeMocks.requireUser.mockReset();
    routeMocks.requireUser.mockResolvedValue("user-1");
  });

  it("未認証なら 401 を返す", async () => {
    routeMocks.requireUser.mockRejectedValue(
      new routeMocks.UnauthorizedError(),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("完了済み一覧を SessionListResponse で返す（日時は ISO 文字列）", async () => {
    routeMocks.completedSessions = [
      {
        id: "sess-2",
        startedAt: new Date("2026-07-02T00:00:00.000Z"),
        endedAt: new Date("2026-07-02T01:00:00.000Z"),
        companyName: "B社",
        industryMajor: null,
        industryMinor: null,
        jobMajor: null,
        jobMinor: null,
        selectionStage: null,
        interviewerType: null,
        questionCount: 5,
        hasFeedback: true,
      },
    ];

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: [
        {
          id: "sess-2",
          startedAt: "2026-07-02T00:00:00.000Z",
          endedAt: "2026-07-02T01:00:00.000Z",
          companyName: "B社",
          industryMajor: null,
          industryMinor: null,
          jobMajor: null,
          jobMinor: null,
          selectionStage: null,
          interviewerType: null,
          questionCount: 5,
          hasFeedback: true,
        },
      ],
    });
  });
});
