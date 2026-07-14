import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }

  class SessionNotFoundError extends Error {
    constructor(sessionId: string) {
      super(`Session not found: ${sessionId}`);
      this.name = "SessionNotFoundError";
    }
  }

  class QuestionNotFoundError extends Error {
    constructor(questionId: string) {
      super(`Question not found: ${questionId}`);
      this.name = "QuestionNotFoundError";
    }
  }

  class QuestionAlreadyAnsweredError extends Error {
    constructor(questionId: string) {
      super(`Question already answered: ${questionId}`);
      this.name = "QuestionAlreadyAnsweredError";
    }
  }

  class InvalidQuestionStateError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidQuestionStateError";
    }
  }

  class FollowUpQuestionGenerationError extends Error {
    constructor(cause: unknown) {
      super("Follow-up question generation failed");
      this.name = "FollowUpQuestionGenerationError";
      this.cause = cause;
    }
  }
  class AnswerTooLongError extends Error {
    constructor() {
      super("Answer text is too long");
      this.name = "AnswerTooLongError";
    }
  }

  return {
    UnauthorizedError,
    SessionNotFoundError,
    QuestionNotFoundError,
    QuestionAlreadyAnsweredError,
    InvalidQuestionStateError,
    FollowUpQuestionGenerationError,
    AnswerTooLongError,
    after: vi.fn(),
    execute: vi.fn(),
    requireUser: vi.fn<() => Promise<string>>(),
  };
});

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: routeMocks.after };
});

vi.mock("@/lib/auth-guard", () => ({
  UnauthorizedError: routeMocks.UnauthorizedError,
  requireUser: routeMocks.requireUser,
}));

vi.mock("@/application/interview/AnswerQuestionUseCase", () => ({
  AnswerQuestionUseCase: class AnswerQuestionUseCase {
    async execute(input: unknown): Promise<unknown> {
      return routeMocks.execute(input);
    }
  },
  SessionNotFoundError: routeMocks.SessionNotFoundError,
  QuestionNotFoundError: routeMocks.QuestionNotFoundError,
  QuestionAlreadyAnsweredError: routeMocks.QuestionAlreadyAnsweredError,
  InvalidQuestionStateError: routeMocks.InvalidQuestionStateError,
  FollowUpQuestionGenerationError: routeMocks.FollowUpQuestionGenerationError,
  AnswerTooLongError: routeMocks.AnswerTooLongError,
}));

vi.mock("@/infrastructure/prisma/PrismaInterviewSessionRepository", () => ({
  PrismaInterviewSessionRepository: class PrismaInterviewSessionRepository {},
}));

vi.mock("@/infrastructure/ai/GeminiFollowUpQuestionService", () => ({
  GeminiFollowUpQuestionService: class GeminiFollowUpQuestionService {},
}));

vi.mock("@/infrastructure/ai/GeminiQuestionSpeechService", () => ({
  GeminiQuestionSpeechService: class GeminiQuestionSpeechService {},
}));

function postRequest(body: string): Request {
  return new Request("http://localhost/api/sessions/session-1/answers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function context(sessionId = "session-1"): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: sessionId }) };
}

describe("POST /api/sessions/[id]/answers", () => {
  beforeEach(() => {
    routeMocks.after.mockReset();
    routeMocks.execute.mockReset();
    routeMocks.requireUser.mockReset();
    routeMocks.requireUser.mockResolvedValue("user-1");
  });

  it("未認証なら 401 を返す", async () => {
    routeMocks.requireUser.mockRejectedValue(
      new routeMocks.UnauthorizedError(),
    );

    const response = await POST(postRequest("{}"), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("不正 JSON なら 400 を返す", async () => {
    const response = await POST(postRequest("{"), context());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("バリデーションエラーなら 400 を返す", async () => {
    const response = await POST(
      postRequest(JSON.stringify({ questionId: "", answerText: "" })),
      context(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Bad Request",
    });
  });

  it("回答が 2000 文字を超えたら 400 を返す（UseCase は呼ばない）", async () => {
    const response = await POST(
      postRequest(
        JSON.stringify({
          questionId: "question-1",
          answerText: "あ".repeat(2001),
        }),
      ),
      context(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Bad Request",
    });
    expect(routeMocks.execute).not.toHaveBeenCalled();
  });

  it("継続時は AnswerResponse を 201 で返す", async () => {
    routeMocks.execute.mockResolvedValue({
      action: "followup",
      answerId: "answer-1",
      nextQuestion: {
        id: "question-2",
        type: QuestionType.FOLLOW_UP,
        content: "深掘り質問です。",
        displayOrder: 6,
        depthCount: 1,
        primaryAxis: null,
        parentQuestionId: "question-1",
      },
      speechText: "読み上げ文です。",
    });

    const response = await POST(
      postRequest(
        JSON.stringify({
          questionId: "question-1",
          answerText: "回答です。",
          voiceEnabled: true,
        }),
      ),
      context("session-1"),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.execute).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
      questionId: "question-1",
      answerText: "回答です。",
      voiceEnabled: true,
    });
    await expect(response.json()).resolves.toEqual({
      answerId: "answer-1",
      isSessionComplete: false,
      nextQuestion: {
        id: "question-2",
        type: "FOLLOW_UP",
        text: "深掘り質問です。",
        parentQuestionId: "question-1",
        speechText: "読み上げ文です。",
      },
    });
  });

  it("完了時は after を予約し、完了レスポンスを 201 で返す", async () => {
    routeMocks.execute.mockResolvedValue({
      action: "complete",
      answerId: "answer-1",
    });

    const response = await POST(
      postRequest(
        JSON.stringify({ questionId: "question-1", answerText: "回答です。" }),
      ),
      context("session-1"),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.after).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      answerId: "answer-1",
      isSessionComplete: true,
      nextQuestion: null,
    });
  });

  it("セッションまたは質問が見つからなければ 404 を返す", async () => {
    routeMocks.execute.mockRejectedValue(
      new routeMocks.SessionNotFoundError("session-1"),
    );

    const response = await POST(
      postRequest(
        JSON.stringify({ questionId: "question-1", answerText: "回答です。" }),
      ),
      context(),
    );

    expect(response.status).toBe(404);
  });

  it("回答済みなら 409 を返す", async () => {
    routeMocks.execute.mockRejectedValue(
      new routeMocks.QuestionAlreadyAnsweredError("question-1"),
    );

    const response = await POST(
      postRequest(
        JSON.stringify({ questionId: "question-1", answerText: "回答です。" }),
      ),
      context(),
    );

    expect(response.status).toBe(409);
  });

  it("深掘り生成に失敗したら 502 を返す", async () => {
    routeMocks.execute.mockRejectedValue(
      new routeMocks.FollowUpQuestionGenerationError(new Error("Gemini failed")),
    );

    const response = await POST(
      postRequest(
        JSON.stringify({ questionId: "question-1", answerText: "回答です。" }),
      ),
      context(),
    );

    expect(response.status).toBe(502);
  });
});
