import { describe, expect, it } from "vitest";

import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import { SessionStatus } from "@/domain/interview/model/SessionStatus.vo";
import type {
  IInterviewSessionLifecycleRepository,
  ResumableSessionSummary,
  ResumeSessionState,
} from "@/domain/interview/ports/IInterviewSessionLifecycleRepository";
import { GetResumableInterviewsUseCase } from "./GetResumableInterviewsUseCase";
import { PauseInterviewUseCase } from "./PauseInterviewUseCase";
import { ResumeInterviewUseCase } from "./ResumeInterviewUseCase";
import { SessionNotFoundError, SessionStatusConflictError } from "./errors";

function session(status: SessionStatus): InterviewSession {
  return {
    id: "session-1",
    userId: "user-1",
    startedAt: new Date("2026-09-01T00:00:00.000Z"),
    endedAt:
      status === SessionStatus.COMPLETED
        ? new Date("2026-09-01T01:00:00.000Z")
        : null,
    status,
    voiceEnabled: true,
    companyName: "Example Inc.",
    industryMajor: null,
    industryMinor: null,
    jobMajor: "Engineer",
    jobMinor: null,
    selectionStage: "first",
    interviewerType: "friendly",
    questions: [],
  };
}

class FakeLifecycleRepository implements IInterviewSessionLifecycleRepository {
  pauseResult: SessionStatus | null = SessionStatus.PAUSED;
  resumeResult: ResumeSessionState | null = {
    session: session(SessionStatus.IN_PROGRESS),
    questions: [
      {
        id: "main-1",
        type: QuestionType.MAIN,
        content: "質問1",
        displayOrder: 1,
        primaryAxis: null,
        parentQuestionId: null,
        answer: { id: "answer-1", content: "回答1" },
      },
      {
        id: "follow-1",
        type: QuestionType.FOLLOW_UP,
        content: "深掘り質問",
        displayOrder: 6,
        primaryAxis: null,
        parentQuestionId: "main-1",
        answer: null,
      },
    ],
  };
  pausedSessions: ResumableSessionSummary[] = [];

  async pauseOwnedSession(): Promise<SessionStatus | null> {
    return this.pauseResult;
  }

  async resumeOwnedSession(): Promise<ResumeSessionState | null> {
    return this.resumeResult;
  }

  async findPausedByUser(): Promise<ResumableSessionSummary[]> {
    return this.pausedSessions;
  }
}

describe("PauseInterviewUseCase", () => {
  it("IN_PROGRESS/PAUSED は中断成功として扱う", async () => {
    const repository = new FakeLifecycleRepository();
    const useCase = new PauseInterviewUseCase(repository);

    repository.pauseResult = SessionStatus.IN_PROGRESS;
    await expect(useCase.execute("user-1", "session-1")).resolves.toBeUndefined();
    repository.pauseResult = SessionStatus.PAUSED;
    await expect(useCase.execute("user-1", "session-1")).resolves.toBeUndefined();
  });

  it("非存在・非所有なら SessionNotFoundError", async () => {
    const repository = new FakeLifecycleRepository();
    repository.pauseResult = null;

    await expect(
      new PauseInterviewUseCase(repository).execute("user-1", "missing"),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it("完了済みなら SessionStatusConflictError", async () => {
    const repository = new FakeLifecycleRepository();
    repository.pauseResult = SessionStatus.COMPLETED;

    await expect(
      new PauseInterviewUseCase(repository).execute("user-1", "session-1"),
    ).rejects.toBeInstanceOf(SessionStatusConflictError);
  });
});

describe("ResumeInterviewUseCase", () => {
  it("DBの回答状況から深掘り質問と質問番号、音声設定を返す", async () => {
    const result = await new ResumeInterviewUseCase(
      new FakeLifecycleRepository(),
    ).execute("user-1", "session-1");

    expect(result).toMatchObject({
      sessionId: "session-1",
      voiceEnabled: true,
      interviewerType: "friendly",
      currentQuestion: { id: "follow-1" },
      questionNumber: 2,
    });
  });

  it("完了済みなら SessionStatusConflictError", async () => {
    const repository = new FakeLifecycleRepository();
    repository.resumeResult = {
      session: session(SessionStatus.COMPLETED),
      questions: [],
    };

    await expect(
      new ResumeInterviewUseCase(repository).execute("user-1", "session-1"),
    ).rejects.toBeInstanceOf(SessionStatusConflictError);
  });
});

describe("GetResumableInterviewsUseCase", () => {
  it("Repositoryの中断セッションを返す", async () => {
    const repository = new FakeLifecycleRepository();
    repository.pausedSessions = [
      {
        id: "session-1",
        startedAt: new Date("2026-09-01T00:00:00.000Z"),
        companyName: null,
        industryMajor: null,
        industryMinor: null,
        jobMajor: null,
        jobMinor: null,
        selectionStage: null,
        interviewerType: null,
        answeredQuestionCount: 2,
      },
    ];

    await expect(
      new GetResumableInterviewsUseCase(repository).execute("user-1"),
    ).resolves.toEqual(repository.pausedSessions);
  });
});
