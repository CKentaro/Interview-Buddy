import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type { Question } from "@/domain/interview/model/Question.entity";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import type {
  CreateFollowUpQuestionInput,
  CreateSessionResult,
  IInterviewSessionRepository,
  QuestionAnswerPair,
  SaveAnswerAndCompleteSessionInput,
  SaveAnswerAndCreateFollowUpQuestionInput,
  SaveAnswerAndCreateFollowUpQuestionResult,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import {
  DuplicateAnswerError as DuplicateAnswerErrorClass,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import type {
  FollowUpGenerationContext,
  GeneratedFollowUpQuestion,
  IFollowUpQuestionService,
} from "@/domain/interview/ports/IFollowUpQuestionService";
import type {
  GenerateQuestionSpeechInput,
  IQuestionSpeechService,
} from "@/domain/interview/ports/IQuestionSpeechService";
import {
  AnswerQuestionUseCase,
  FollowUpQuestionGenerationError,
  QuestionAlreadyAnsweredError,
} from "./AnswerQuestionUseCase";

const mainQuestion: Question = {
  id: "main-1",
  type: QuestionType.MAIN,
  content: "学生時代に力を入れたことを教えてください。",
  displayOrder: 1,
  depthCount: 0,
  primaryAxis: EvaluationAxis.REPRODUCIBILITY,
  parentQuestionId: null,
};

const secondFollowUpQuestion: Question = {
  id: "follow-2",
  type: QuestionType.FOLLOW_UP,
  content: "その工夫を別の場面で再現した経験はありますか。",
  displayOrder: 3,
  depthCount: 2,
  primaryAxis: EvaluationAxis.REPRODUCIBILITY,
  parentQuestionId: mainQuestion.id,
};

const nextMainQuestion: Question = {
  id: "main-2",
  type: QuestionType.MAIN,
  content: "次のメイン質問です。",
  displayOrder: 2,
  depthCount: 0,
  primaryAxis: EvaluationAxis.SELF_AWARENESS,
  parentQuestionId: null,
};

function createSession(questions: Question[]): InterviewSession {
  return {
    id: "session-1",
    userId: "user-1",
    startedAt: new Date("2026-07-08T00:00:00.000Z"),
    endedAt: null,
    companyName: null,
    industryMajor: null,
    industryMinor: null,
    jobMajor: null,
    jobMinor: null,
    selectionStage: null,
    interviewerType: null,
    questions,
  };
}

class FakeInterviewSessionRepository implements IInterviewSessionRepository {
  session: InterviewSession | null = createSession([
    mainQuestion,
    secondFollowUpQuestion,
    nextMainQuestion,
  ]);
  questions = new Map<string, Question>(
    [mainQuestion, secondFollowUpQuestion, nextMainQuestion].map((question) => [
      question.id,
      question,
    ]),
  );
  answeredQuestionIds = new Set<string>();
  nextMainQuestion: Question | null = nextMainQuestion;
  maxDisplayOrder = 3;
  duplicateOnSave = false;
  history: QuestionAnswerPair[] = [
    {
      questionId: mainQuestion.id,
      questionText: mainQuestion.content,
      answerText: null,
    },
  ];

  saveAnswerCalls: Array<{ questionId: string; content: string }> = [];
  createFollowUpQuestionCalls: CreateFollowUpQuestionInput[] = [];
  saveAnswerAndCreateFollowUpQuestionCalls:
    SaveAnswerAndCreateFollowUpQuestionInput[] = [];
  saveAnswerAndCompleteSessionCalls: SaveAnswerAndCompleteSessionInput[] = [];

  async createSession(): Promise<CreateSessionResult> {
    throw new Error("Not used");
  }

  async findSessionByIdForUser(
    sessionId: string,
    userId: string,
  ): Promise<InterviewSession | null> {
    if (
      this.session === null ||
      this.session.id !== sessionId ||
      this.session.userId !== userId
    ) {
      return null;
    }
    return this.session;
  }

  async findQuestionById(questionId: string): Promise<Question | null> {
    return this.questions.get(questionId) ?? null;
  }

  async findQuestionByIdInSession(
    _sessionId: string,
    questionId: string,
  ): Promise<Question | null> {
    return this.questions.get(questionId) ?? null;
  }

  async hasAnswerForQuestion(questionId: string): Promise<boolean> {
    return this.answeredQuestionIds.has(questionId);
  }

  async findNextMainQuestion(): Promise<Question | null> {
    return this.nextMainQuestion;
  }

  async getMaxDisplayOrder(): Promise<number> {
    return this.maxDisplayOrder;
  }

  async findConversationHistory(): Promise<QuestionAnswerPair[]> {
    return this.history;
  }

  async saveAnswer(questionId: string, content: string) {
    this.saveAnswerCalls.push({ questionId, content });
    if (this.duplicateOnSave) {
      throw new DuplicateAnswerErrorClass(questionId);
    }
    return { id: `answer-${questionId}`, questionId, content };
  }

  async createFollowUpQuestion(
    input: CreateFollowUpQuestionInput,
  ): Promise<Question> {
    this.createFollowUpQuestionCalls.push(input);
    return {
      id: "follow-created",
      type: QuestionType.FOLLOW_UP,
      content: input.content,
      displayOrder: input.displayOrder,
      depthCount: input.depthCount,
      primaryAxis: input.primaryAxis,
      parentQuestionId: input.parentMainQuestionId,
    };
  }

  async saveAnswerAndCreateFollowUpQuestion(
    input: SaveAnswerAndCreateFollowUpQuestionInput,
  ): Promise<SaveAnswerAndCreateFollowUpQuestionResult> {
    this.saveAnswerAndCreateFollowUpQuestionCalls.push(input);
    if (this.duplicateOnSave) {
      throw new DuplicateAnswerErrorClass(input.answer.questionId);
    }
    return {
      answer: {
        id: `answer-${input.answer.questionId}`,
        questionId: input.answer.questionId,
        content: input.answer.content,
      },
      followUpQuestion: {
        id: "follow-created",
        type: QuestionType.FOLLOW_UP,
        content: input.followUpQuestion.content,
        displayOrder: input.followUpQuestion.displayOrder,
        depthCount: input.followUpQuestion.depthCount,
        primaryAxis: input.followUpQuestion.primaryAxis,
        parentQuestionId: input.followUpQuestion.parentMainQuestionId,
      },
    };
  }

  async saveAnswerAndCompleteSession(
    input: SaveAnswerAndCompleteSessionInput,
  ) {
    this.saveAnswerAndCompleteSessionCalls.push(input);
    if (this.duplicateOnSave) {
      throw new DuplicateAnswerErrorClass(input.answer.questionId);
    }
    return {
      id: `answer-${input.answer.questionId}`,
      questionId: input.answer.questionId,
      content: input.answer.content,
    };
  }

  async completeSession(): Promise<void> {
    throw new Error("Use saveAnswerAndCompleteSession instead");
  }
}

class FakeFollowUpQuestionService implements IFollowUpQuestionService {
  calls: FollowUpGenerationContext[] = [];
  result: GeneratedFollowUpQuestion = {
    displayText: "その取り組みを再現できた理由は何ですか。",
    speechText: "なるほど。では、その取り組みを再現できた理由を教えてください。",
  };
  error: Error | null = null;

  async generate(
    context: FollowUpGenerationContext,
  ): Promise<GeneratedFollowUpQuestion> {
    this.calls.push(context);
    if (this.error) {
      throw this.error;
    }
    return this.result;
  }
}

class FakeQuestionSpeechService implements IQuestionSpeechService {
  calls: GenerateQuestionSpeechInput[] = [];
  result = "ありがとうございます。では次の質問に移ります。";
  error: Error | null = null;

  async generate(input: GenerateQuestionSpeechInput): Promise<string> {
    this.calls.push(input);
    if (this.error) {
      throw this.error;
    }
    return this.result;
  }
}

function createUseCase(
  repository = new FakeInterviewSessionRepository(),
  followUpService = new FakeFollowUpQuestionService(),
  speechService = new FakeQuestionSpeechService(),
): AnswerQuestionUseCase {
  return new AnswerQuestionUseCase(repository, followUpService, speechService);
}

describe("AnswerQuestionUseCase", () => {
  it("followup: Gemini 生成成功後に Answer と FollowUpQuestion を transaction 保存する", async () => {
    const repository = new FakeInterviewSessionRepository();
    const followUpService = new FakeFollowUpQuestionService();
    const useCase = createUseCase(repository, followUpService);

    const result = await useCase.execute({
      userId: "user-1",
      sessionId: "session-1",
      questionId: mainQuestion.id,
      answerText: "チーム開発で品質改善に取り組みました。",
      voiceEnabled: true,
    });

    expect(result).toMatchObject({
      action: "followup",
      answerId: "answer-main-1",
      nextQuestion: { id: "follow-created" },
      speechText: followUpService.result.speechText,
    });
    expect(followUpService.calls[0]?.conversationHistory).toEqual([
      {
        questionId: mainQuestion.id,
        questionText: mainQuestion.content,
        answerText: "チーム開発で品質改善に取り組みました。",
      },
    ]);
    expect(repository.saveAnswerCalls).toHaveLength(0);
    expect(repository.createFollowUpQuestionCalls).toHaveLength(0);
    expect(repository.saveAnswerAndCreateFollowUpQuestionCalls).toEqual([
      {
        answer: {
          questionId: mainQuestion.id,
          content: "チーム開発で品質改善に取り組みました。",
        },
        followUpQuestion: {
          sessionId: "session-1",
          parentMainQuestionId: mainQuestion.id,
          content: followUpService.result.displayText,
          displayOrder: repository.maxDisplayOrder + 1,
          depthCount: mainQuestion.depthCount + 1,
          primaryAxis: mainQuestion.primaryAxis,
        },
      },
    ]);
  });

  it("followup: Gemini 生成に失敗したら回答も深掘り質問も保存しない", async () => {
    const repository = new FakeInterviewSessionRepository();
    const followUpService = new FakeFollowUpQuestionService();
    followUpService.error = new Error("Gemini failed");
    const useCase = createUseCase(repository, followUpService);

    await expect(
      useCase.execute({
        userId: "user-1",
        sessionId: "session-1",
        questionId: mainQuestion.id,
        answerText: "回答です。",
      }),
    ).rejects.toBeInstanceOf(FollowUpQuestionGenerationError);

    expect(repository.saveAnswerCalls).toHaveLength(0);
    expect(repository.createFollowUpQuestionCalls).toHaveLength(0);
    expect(repository.saveAnswerAndCreateFollowUpQuestionCalls).toHaveLength(0);
    expect(repository.saveAnswerAndCompleteSessionCalls).toHaveLength(0);
  });

  it("next_main: 深掘り上限到達後に次の MainQuestion と読み上げ文を返す", async () => {
    const repository = new FakeInterviewSessionRepository();
    const speechService = new FakeQuestionSpeechService();
    const useCase = createUseCase(
      repository,
      new FakeFollowUpQuestionService(),
      speechService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      sessionId: "session-1",
      questionId: secondFollowUpQuestion.id,
      answerText: "別プロジェクトでも同じ工夫を使いました。",
      voiceEnabled: true,
    });

    expect(result).toEqual({
      action: "next_main",
      answerId: "answer-follow-2",
      nextQuestion: nextMainQuestion,
      speechText: speechService.result,
    });
    expect(repository.saveAnswerCalls).toEqual([
      {
        questionId: secondFollowUpQuestion.id,
        content: "別プロジェクトでも同じ工夫を使いました。",
      },
    ]);
    expect(speechService.calls).toEqual([
      {
        displayText: nextMainQuestion.content,
        previousQuestionText: secondFollowUpQuestion.content,
        previousAnswerText: "別プロジェクトでも同じ工夫を使いました。",
      },
    ]);
  });

  it("complete: 次の MainQuestion がなければ回答保存とセッション終了を transaction で行う", async () => {
    const repository = new FakeInterviewSessionRepository();
    repository.nextMainQuestion = null;
    const useCase = createUseCase(repository);

    const result = await useCase.execute({
      userId: "user-1",
      sessionId: "session-1",
      questionId: secondFollowUpQuestion.id,
      answerText: "最後の回答です。",
    });

    expect(result).toEqual({
      action: "complete",
      answerId: "answer-follow-2",
    });
    expect(repository.saveAnswerAndCompleteSessionCalls).toEqual([
      {
        sessionId: "session-1",
        answer: {
          questionId: secondFollowUpQuestion.id,
          content: "最後の回答です。",
        },
      },
    ]);
  });

  it("回答済みなら保存処理に進まず QuestionAlreadyAnsweredError を投げる", async () => {
    const repository = new FakeInterviewSessionRepository();
    repository.answeredQuestionIds.add(mainQuestion.id);
    const useCase = createUseCase(repository);

    await expect(
      useCase.execute({
        userId: "user-1",
        sessionId: "session-1",
        questionId: mainQuestion.id,
        answerText: "回答です。",
      }),
    ).rejects.toBeInstanceOf(QuestionAlreadyAnsweredError);

    expect(repository.saveAnswerAndCreateFollowUpQuestionCalls).toHaveLength(0);
  });

  it("DB unique 制約由来の DuplicateAnswerError も QuestionAlreadyAnsweredError に変換する", async () => {
    const repository = new FakeInterviewSessionRepository();
    repository.duplicateOnSave = true;
    const useCase = createUseCase(repository);

    await expect(
      useCase.execute({
        userId: "user-1",
        sessionId: "session-1",
        questionId: mainQuestion.id,
        answerText: "回答です。",
      }),
    ).rejects.toBeInstanceOf(QuestionAlreadyAnsweredError);
  });
});
