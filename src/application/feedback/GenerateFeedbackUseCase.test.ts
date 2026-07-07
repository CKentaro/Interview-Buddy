import { describe, expect, it, vi } from "vitest";

import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type { IFeedbackContextProvider } from "@/domain/feedback/ports/IFeedbackContextProvider";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import type {
  GeneratedFeedback,
  IFeedbackService,
} from "@/domain/feedback/ports/IFeedbackService";
import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import { FeedbackAlreadyExistsError } from "@/domain/feedback/errors";
import { GenerateFeedbackUseCase } from "./GenerateFeedbackUseCase";

const existingFeedback: Feedback = {
  id: "fb-1",
  overallComment: "既存",
  sessionId: "sess-1",
  axisFeedbacks: [],
};

const generated: GeneratedFeedback = {
  overallComment: "総評",
  axisFeedbacks: [
    { axis: EvaluationAxis.REPRODUCIBILITY, comment: "再現性" },
    { axis: EvaluationAxis.SELF_AWARENESS, comment: "自己認識" },
    { axis: EvaluationAxis.VALUES_JUDGMENT, comment: "価値観" },
    { axis: EvaluationAxis.WORLDVIEW, comment: "世界観" },
  ],
};

function setup(overrides?: {
  existing?: Feedback | null;
  generate?: IFeedbackService["generate"];
}) {
  const provider: IFeedbackContextProvider = {
    loadQARows: vi.fn().mockResolvedValue([
      {
        primaryAxis: EvaluationAxis.REPRODUCIBILITY,
        questionText: "Q",
        answerText: "A",
      },
    ]),
  };
  const service: IFeedbackService = {
    generate: overrides?.generate ?? vi.fn().mockResolvedValue(generated),
  };
  const repository: IFeedbackRepository = {
    findBySessionId: vi
      .fn()
      .mockResolvedValue(overrides?.existing ?? null),
    save: vi.fn().mockResolvedValue(existingFeedback),
  };
  const useCase = new GenerateFeedbackUseCase(provider, service, repository);
  return { useCase, provider, service, repository };
}

describe("GenerateFeedbackUseCase", () => {
  it("二重生成ガード: 既存があれば生成も保存もしない", async () => {
    const { useCase, provider, service, repository } = setup({
      existing: existingFeedback,
    });

    await useCase.execute("sess-1");

    expect(provider.loadQARows).not.toHaveBeenCalled();
    expect(service.generate).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("全成功: 生成結果を NewFeedback として保存する", async () => {
    const { useCase, service, repository } = setup();

    await useCase.execute("sess-1");

    expect(service.generate).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith({
      sessionId: "sess-1",
      overallComment: "総評",
      axisFeedbacks: [
        { axis: EvaluationAxis.REPRODUCIBILITY, comment: "再現性" },
        { axis: EvaluationAxis.SELF_AWARENESS, comment: "自己認識" },
        { axis: EvaluationAxis.VALUES_JUDGMENT, comment: "価値観" },
        { axis: EvaluationAxis.WORLDVIEW, comment: "世界観" },
      ],
    });
  });

  it("部分保存しない: 生成が失敗したら save に到達しない", async () => {
    const { useCase, repository } = setup({
      generate: vi.fn().mockRejectedValue(new Error("LLM failed")),
    });

    await expect(useCase.execute("sess-1")).rejects.toThrow("LLM failed");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("並行実行の一意制約違反（FeedbackAlreadyExistsError）は no-op 扱いにする", async () => {
    const { useCase, provider, service, repository } = setup();
    // 事前チェックはすり抜けたが save で一意制約に弾かれるケース。
    (repository.save as ReturnType<typeof vi.fn>).mockRejectedValue(
      new FeedbackAlreadyExistsError("sess-1"),
    );

    // 例外を投げず正常終了する（別の生成が先に成功した）。
    await expect(useCase.execute("sess-1")).resolves.toBeUndefined();
    expect(provider.loadQARows).toHaveBeenCalled();
    expect(service.generate).toHaveBeenCalled();
  });
});
