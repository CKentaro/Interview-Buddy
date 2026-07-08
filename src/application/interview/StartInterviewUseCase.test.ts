import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { Answer } from "@/domain/interview/model/Answer.entity";
import type { Question } from "@/domain/interview/model/Question.entity";
import type { BankAxis, QuestionBank } from "@/domain/interview/model/QuestionBank.vo";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import type {
  CreateSessionInput,
  CreateSessionResult,
  IInterviewSessionRepository,
  QuestionAnswerPair,
  SaveAnswerAndCreateFollowUpQuestionResult,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IOpeningSpeechService } from "@/domain/interview/ports/IOpeningSpeechService";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import { StartInterviewUseCase } from "./StartInterviewUseCase";

function axis(axisValue: EvaluationAxis, n: number): BankAxis {
  return {
    axis: axisValue,
    questions: Array.from({ length: n }, (_, i) => ({
      id: `${axisValue}-${i}`,
      displayText: `${axisValue} 質問 ${i}`,
    })),
  };
}

const bank: QuestionBank = {
  values: axis(EvaluationAxis.VALUES_JUDGMENT, 3),
  reproducibility: axis(EvaluationAxis.REPRODUCIBILITY, 3),
  selfAwareness: axis(EvaluationAxis.SELF_AWARENESS, 3),
  worldview: axis(EvaluationAxis.WORLDVIEW, 3),
};

class FakeQuestionBankProvider implements IQuestionBankProvider {
  load(): QuestionBank {
    return bank;
  }
}

class FakeInterviewSessionRepository implements IInterviewSessionRepository {
  createSessionInput: CreateSessionInput | null = null;

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    this.createSessionInput = input;
    const firstSelected = input.selectedQuestions.find(
      (question) => question.displayOrder === 1,
    );
    if (!firstSelected) {
      throw new Error("No first question");
    }
    const firstQuestion: Question = {
      id: "question-1",
      type: QuestionType.MAIN,
      content: firstSelected.displayText,
      displayOrder: firstSelected.displayOrder,
      depthCount: 0,
      primaryAxis: firstSelected.axis,
      parentQuestionId: null,
    };
    return {
      session: {
        id: "session-1",
        userId: input.userId,
        startedAt: new Date("2026-07-07T00:00:00.000Z"),
        endedAt: null,
        companyName: input.companyName ?? null,
        industryMajor: input.industryMajor ?? null,
        industryMinor: input.industryMinor ?? null,
        jobMajor: input.jobTitle ?? null,
        jobMinor: input.jobMinor ?? null,
        selectionStage: input.selectionStage ?? null,
        interviewerType: input.interviewerType ?? null,
        questions: [firstQuestion],
      },
      firstQuestion,
    };
  }

  async findQuestionById(): Promise<Question | null> {
    throw new Error("Not implemented");
  }

  async findSessionByIdForUser(): Promise<never> {
    throw new Error("Not implemented");
  }

  async findQuestionByIdInSession(): Promise<Question | null> {
    throw new Error("Not implemented");
  }

  async hasAnswerForQuestion(): Promise<boolean> {
    throw new Error("Not implemented");
  }

  async findNextMainQuestion(): Promise<Question | null> {
    throw new Error("Not implemented");
  }

  async getMaxDisplayOrder(): Promise<number> {
    throw new Error("Not implemented");
  }

  async findConversationHistory(): Promise<QuestionAnswerPair[]> {
    throw new Error("Not implemented");
  }

  async saveAnswer(): Promise<never> {
    throw new Error("Not implemented");
  }

  async createFollowUpQuestion(): Promise<Question> {
    throw new Error("Not implemented");
  }

  async saveAnswerAndCreateFollowUpQuestion(): Promise<SaveAnswerAndCreateFollowUpQuestionResult> {
    throw new Error("Not implemented");
  }

  async saveAnswerAndCompleteSession(): Promise<Answer> {
    throw new Error("Not implemented");
  }

  async completeSession(): Promise<void> {
    throw new Error("Not implemented");
  }
}

class FakeOpeningSpeechService implements IOpeningSpeechService {
  constructor(private readonly result: "success" | "failure") {}

  async generate(): Promise<string> {
    if (this.result === "failure") {
      throw new Error("LLM failed");
    }
    return "生成された開始発話";
  }
}

describe("StartInterviewUseCase", () => {
  it("質問バンクから本質問5問を選定し、セッション作成へ渡す", async () => {
    const repository = new FakeInterviewSessionRepository();
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
    );

    const result = await useCase.execute({
      userId: "user-1",
      companyName: "Example Inc.",
      voiceEnabled: false,
    });

    expect(repository.createSessionInput?.selectedQuestions).toHaveLength(5);
    expect(repository.createSessionInput?.selectedQuestions.map((q) => q.displayOrder)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(result.session.id).toBe("session-1");
    expect(result.firstQuestion.id).toBe("question-1");
    expect(result.speechText).toBe(result.firstQuestion.content);
  });

  it("voiceEnabled=true のときだけ開始発話を使う", async () => {
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      new FakeInterviewSessionRepository(),
      new FakeOpeningSpeechService("success"),
    );

    const result = await useCase.execute({
      userId: "user-1",
      voiceEnabled: true,
    });

    expect(result.speechText).toBe("生成された開始発話");
  });

  it("開始発話生成に失敗しても displayText にフォールバックする", async () => {
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      new FakeInterviewSessionRepository(),
      new FakeOpeningSpeechService("failure"),
    );

    const result = await useCase.execute({
      userId: "user-1",
      voiceEnabled: true,
    });

    expect(result.speechText).toBe(result.firstQuestion.content);
  });
});
