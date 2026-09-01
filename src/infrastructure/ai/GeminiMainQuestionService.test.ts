import { beforeEach, describe, expect, it, vi } from "vitest";

// AI SDK をモック（実 API を叩かずに検証ロジックだけを確かめる）。
const generateText = vi.hoisted(() => vi.fn());
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => () => "mock-model",
}));
vi.mock("ai", () => ({
  generateText,
  Output: { object: (spec: unknown) => spec },
}));

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import {
  EmploymentKind,
  JobPostingPageKind,
} from "@/domain/interview/model/JobPosting.vo";
import { MAIN_QUESTION_AXIS_PLAN } from "@/domain/interview/model/mainQuestionPlan";
import { MainQuestionSource } from "@/domain/interview/model/SelectedQuestion.vo";
import type { MainQuestionGenerationContext } from "@/domain/interview/ports/IMainQuestionGenerationService";
import {
  GeminiMainQuestionService,
  MainQuestionGenerationError,
} from "./GeminiMainQuestionService";

const context: MainQuestionGenerationContext = {
  jobPosting: {
    pageKind: JobPostingPageKind.SINGLE_JOB_POSTING,
    usableAsContext: true,
    companyName: "株式会社テスト",
    industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
    job: { major: "技術系", minor: "Webエンジニア" },
    employmentKind: EmploymentKind.NEW_GRADUATE,
    businessSummary: "テスト事業",
    jobSummary: "テスト職務",
    keyPoints: ["特徴1"],
  },
  plan: MAIN_QUESTION_AXIS_PLAN,
};

/** 計画どおりの生成結果。 */
function plannedQuestions() {
  return MAIN_QUESTION_AXIS_PLAN.map((entry) => ({
    displayOrder: entry.displayOrder,
    axis: entry.axis,
    displayText: `質問 ${entry.displayOrder}`,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GeminiMainQuestionService", () => {
  it("計画の軸・表示順に並べ替えて返す", async () => {
    // 生成側が順序を守らない場合でも、計画側から引き当てて整える。
    generateText.mockResolvedValue({
      output: { questions: [...plannedQuestions()].reverse() },
    });

    const result = await new GeminiMainQuestionService().generate(context);

    expect(result.map((q) => q.displayOrder)).toEqual(
      MAIN_QUESTION_AXIS_PLAN.map((entry) => entry.displayOrder),
    );
    expect(result.map((q) => q.axis)).toEqual(
      MAIN_QUESTION_AXIS_PLAN.map((entry) => entry.axis),
    );
    expect(result.every((q) => q.source === MainQuestionSource.GENERATED)).toBe(true);
    expect(result.every((q) => q.bankId === null)).toBe(true);
  });

  // 軸の構成が崩れるとフィードバックの 4 軸集計が成立しなくなるため、
  // 部分的に欠けた生成結果は採用せず全体を失敗にする。
  it("計画の 1 問が欠けていれば例外を投げる", async () => {
    generateText.mockResolvedValue({
      output: { questions: plannedQuestions().slice(1) },
    });

    await expect(new GeminiMainQuestionService().generate(context)).rejects.toBeInstanceOf(
      MainQuestionGenerationError,
    );
  });

  it("軸が計画と食い違っていれば例外を投げる", async () => {
    const questions = plannedQuestions();
    questions[0] = { ...questions[0]!, axis: EvaluationAxis.WORLDVIEW };
    generateText.mockResolvedValue({ output: { questions } });

    await expect(new GeminiMainQuestionService().generate(context)).rejects.toBeInstanceOf(
      MainQuestionGenerationError,
    );
  });

  it("質問文が空白のみなら例外を投げる", async () => {
    const questions = plannedQuestions();
    questions[2] = { ...questions[2]!, displayText: "   " };
    generateText.mockResolvedValue({ output: { questions } });

    await expect(new GeminiMainQuestionService().generate(context)).rejects.toBeInstanceOf(
      MainQuestionGenerationError,
    );
  });

  it("求人情報と軸の定義をプロンプトに含める", async () => {
    generateText.mockResolvedValue({ output: { questions: plannedQuestions() } });

    await new GeminiMainQuestionService().generate(context);

    const prompt = generateText.mock.calls[0]?.[0]?.prompt as string;
    expect(prompt).toContain("株式会社テスト");
    expect(prompt).toContain("テスト事業");
    expect(prompt).toContain("特徴1");
    // 新卒向け求人なので、実務経験を前提にしない応募者像を渡す。
    expect(prompt).toContain("就職活動中の学生");
  });
});
