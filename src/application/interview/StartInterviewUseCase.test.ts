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
import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import {
  EmploymentKind,
  JobPostingPageKind,
} from "@/domain/interview/model/JobPosting.vo";
import type { SelectedQuestion } from "@/domain/interview/model/SelectedQuestion.vo";
import { MainQuestionSource } from "@/domain/interview/model/SelectedQuestion.vo";
import { MAIN_QUESTION_AXIS_PLAN } from "@/domain/interview/model/mainQuestionPlan";
import type {
  IMainQuestionGenerationService,
  MainQuestionGenerationContext,
} from "@/domain/interview/ports/IMainQuestionGenerationService";
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
  /** tryConsumeVoiceQuota が返す値（true=枠を消費できた / false=使用済み）。 */
  voiceQuotaConsumable = true;
  tryConsumeVoiceQuotaCalls: Array<{ userId: string; usageDate: string }> = [];

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
        jobMajor: input.jobMajor ?? null,
        jobMinor: input.jobMinor ?? null,
        selectionStage: input.selectionStage ?? null,
        interviewerType: input.interviewerType ?? null,
        questions: [firstQuestion],
      },
      firstQuestion,
    };
  }

  async tryConsumeVoiceQuota(
    userId: string,
    usageDate: string,
  ): Promise<boolean> {
    this.tryConsumeVoiceQuotaCalls.push({ userId, usageDate });
    return this.voiceQuotaConsumable;
  }

  async countVoiceUsageOnDate(): Promise<number> {
    throw new Error("Not implemented");
  }

  async isVoiceEnabledSessionForUser(): Promise<boolean> {
    throw new Error("Not implemented");
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

  async deleteOwnedSession(): Promise<boolean> {
    throw new Error("Not implemented");
  }

  async findDetailById(): Promise<null> {
    throw new Error("Not implemented");
  }

  async findCompletedByUser(): Promise<never[]> {
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

const jobPosting: JobPostingContext = {
  pageKind: JobPostingPageKind.SINGLE_JOB_POSTING,
  usableAsContext: true,
  companyName: "株式会社テスト",
  industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
  job: { major: "技術系", minor: "Webエンジニア" },
  employmentKind: EmploymentKind.NEW_GRADUATE,
  businessSummary: "テスト事業",
  jobSummary: "テスト職務",
  keyPoints: ["特徴1"],
};

class FakeMainQuestionGenerationService implements IMainQuestionGenerationService {
  receivedContext: MainQuestionGenerationContext | null = null;
  constructor(private readonly behavior: "success" | "failure") {}

  async generate(
    context: MainQuestionGenerationContext,
  ): Promise<SelectedQuestion[]> {
    this.receivedContext = context;
    if (this.behavior === "failure") {
      throw new Error("generation failed");
    }
    return context.plan.map((entry) => ({
      bankId: null,
      source: MainQuestionSource.GENERATED,
      displayText: `求人由来の質問 ${entry.displayOrder}`,
      axis: entry.axis,
      displayOrder: entry.displayOrder,
    }));
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

  it.each(["friendly", "neutral", "strict"] as const)(
    "%sでも本質問数は共通の5問になる",
    async (interviewerType) => {
      const repository = new FakeInterviewSessionRepository();
      const useCase = new StartInterviewUseCase(
        new FakeQuestionBankProvider(),
        repository,
      );

      await useCase.execute({ userId: "user-1", interviewerType });

      expect(repository.createSessionInput?.interviewerType).toBe(
        interviewerType,
      );
      expect(repository.createSessionInput?.selectedQuestions).toHaveLength(5);
    },
  );

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

  it("音声を要求し枠を消費できれば voiceEnabled=true でセッションを作る", async () => {
    const repository = new FakeInterviewSessionRepository();
    repository.voiceQuotaConsumable = true;
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
      new FakeOpeningSpeechService("success"),
    );

    const result = await useCase.execute({ userId: "user-1", voiceEnabled: true });

    expect(result.voiceEnabled).toBe(true);
    expect(repository.createSessionInput?.voiceEnabled).toBe(true);
    expect(result.speechText).toBe("生成された開始発話");
    // 枠消費はセッション作成前に JST 日付キーで 1 回だけ試みる。
    expect(repository.tryConsumeVoiceQuotaCalls).toHaveLength(1);
    expect(repository.tryConsumeVoiceQuotaCalls[0]?.usageDate).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("枠を消費できなければ（使用済み）voiceEnabled=false にフォールバックする", async () => {
    const repository = new FakeInterviewSessionRepository();
    repository.voiceQuotaConsumable = false;
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
      new FakeOpeningSpeechService("success"),
    );

    const result = await useCase.execute({ userId: "user-1", voiceEnabled: true });

    expect(result.voiceEnabled).toBe(false);
    expect(repository.createSessionInput?.voiceEnabled).toBe(false);
    // 音声 OFF なので開始発話は生成せず、displayText のまま。
    expect(result.speechText).toBe(result.firstQuestion.content);
  });

  it("音声を要求しなければ枠消費を試みない", async () => {
    const repository = new FakeInterviewSessionRepository();
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
      new FakeOpeningSpeechService("success"),
    );

    const result = await useCase.execute({ userId: "user-1", voiceEnabled: false });

    expect(result.voiceEnabled).toBe(false);
    expect(repository.tryConsumeVoiceQuotaCalls).toHaveLength(0);
  });

  it("求人由来の生成を要求すると、生成された本質問でセッションを作る", async () => {
    const repository = new FakeInterviewSessionRepository();
    const generationService = new FakeMainQuestionGenerationService("success");
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
      undefined,
      generationService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      jobPosting,
      generateQuestionsFromJobPosting: true,
    });

    expect(result.questionsGeneratedFromJobPosting).toBe(true);
    expect(generationService.receivedContext?.jobPosting).toBe(jobPosting);
    // 軸構成はバンク抽選と同じ計画を渡す（フィードバックの 4 軸集計が前提にしている）。
    expect(generationService.receivedContext?.plan).toBe(MAIN_QUESTION_AXIS_PLAN);
    expect(repository.createSessionInput?.selectedQuestions.map((q) => q.displayText))
      .toEqual([1, 2, 3, 4, 5].map((n) => `求人由来の質問 ${n}`));
  });

  it("生成に失敗してもバンク抽選へ落として面接を開始できる", async () => {
    const repository = new FakeInterviewSessionRepository();
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      repository,
      undefined,
      new FakeMainQuestionGenerationService("failure"),
    );

    const result = await useCase.execute({
      userId: "user-1",
      jobPosting,
      generateQuestionsFromJobPosting: true,
    });

    expect(result.questionsGeneratedFromJobPosting).toBe(false);
    expect(repository.createSessionInput?.selectedQuestions).toHaveLength(5);
    expect(
      repository.createSessionInput?.selectedQuestions.every(
        (q) => q.source === MainQuestionSource.BANK,
      ),
    ).toBe(true);
  });

  // 解析結果はクライアント経由で戻るため、usableAsContext を書き換えた
  // リクエストでも生成へ進ませない（ページ種別と突き合わせて弾く）。
  it("ページ種別と矛盾する解析結果（エラーページなのに使える）では生成を試みない", async () => {
    const generationService = new FakeMainQuestionGenerationService("success");
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      new FakeInterviewSessionRepository(),
      undefined,
      generationService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      jobPosting: {
        ...jobPosting,
        pageKind: JobPostingPageKind.ERROR_OR_LOGIN,
        usableAsContext: true,
      },
      generateQuestionsFromJobPosting: true,
    });

    expect(result.questionsGeneratedFromJobPosting).toBe(false);
    expect(generationService.receivedContext).toBeNull();
  });

  it("文脈として使えない求人（一覧ページ等）では生成を試みない", async () => {
    const generationService = new FakeMainQuestionGenerationService("success");
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      new FakeInterviewSessionRepository(),
      undefined,
      generationService,
    );

    const result = await useCase.execute({
      userId: "user-1",
      jobPosting: { ...jobPosting, usableAsContext: false },
      generateQuestionsFromJobPosting: true,
    });

    expect(result.questionsGeneratedFromJobPosting).toBe(false);
    expect(generationService.receivedContext).toBeNull();
  });

  it("生成を要求しなければバンク抽選を使う", async () => {
    const generationService = new FakeMainQuestionGenerationService("success");
    const useCase = new StartInterviewUseCase(
      new FakeQuestionBankProvider(),
      new FakeInterviewSessionRepository(),
      undefined,
      generationService,
    );

    const result = await useCase.execute({ userId: "user-1", jobPosting });

    expect(result.questionsGeneratedFromJobPosting).toBe(false);
    expect(generationService.receivedContext).toBeNull();
  });
});
