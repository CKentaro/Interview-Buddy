import { generateText, Output } from "ai";
import { z } from "zod";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { SelectedQuestion } from "@/domain/interview/model/SelectedQuestion.vo";
import { MainQuestionSource } from "@/domain/interview/model/SelectedQuestion.vo";
import type {
  IMainQuestionGenerationService,
  MainQuestionGenerationContext,
} from "@/domain/interview/ports/IMainQuestionGenerationService";
import { geminiModel } from "./geminiModel";
import { buildMainQuestionGenerationPrompt } from "./mainQuestionPrompts";

// NOTE: 配列の件数はスキーマでは縛れない（Gemini が minItems/maxItems を守らない）。
// 件数と軸の整合はプロンプトで指示し、生成後に検証する。
const generationSchema = z.object({
  questions: z.array(
    z.object({
      displayOrder: z.number(),
      axis: z.enum([
        EvaluationAxis.SELF_AWARENESS,
        EvaluationAxis.REPRODUCIBILITY,
        EvaluationAxis.VALUES_JUDGMENT,
        EvaluationAxis.WORLDVIEW,
      ]),
      displayText: z.string(),
    }),
  ),
});

/** 生成結果が計画どおりでないことを表す例外。呼び出し側はバンク抽選へ落とす。 */
export class MainQuestionGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MainQuestionGenerationError";
  }
}

/**
 * IMainQuestionGenerationService の Gemini 実装（Vercel AI SDK / 構造化出力）。
 * プロンプトは {@link ./mainQuestionPrompts} に集約する。
 */
export class GeminiMainQuestionService implements IMainQuestionGenerationService {
  async generate(
    context: MainQuestionGenerationContext,
  ): Promise<SelectedQuestion[]> {
    const result = await generateText({
      model: geminiModel(),
      output: Output.object({ schema: generationSchema }),
      prompt: buildMainQuestionGenerationPrompt(context),
    });

    // 計画（表示順と軸）どおりに並べ替える。生成物の順序や件数は信用しない。
    // 軸の構成が崩れるとフィードバックの 4 軸集計が成立しなくなるため、
    // 1 問でも欠けたら生成全体を失敗として扱い、バンク抽選へ落とす。
    return context.plan.map((entry) => {
      const generated = result.output.questions.find(
        (question) =>
          question.displayOrder === entry.displayOrder &&
          question.axis === entry.axis,
      );
      const displayText = generated?.displayText.trim() ?? "";
      if (displayText.length === 0) {
        throw new MainQuestionGenerationError(
          `生成結果に ${entry.displayOrder} 問目（${entry.axis}）が含まれていません`,
        );
      }
      return {
        bankId: null,
        source: MainQuestionSource.GENERATED,
        displayText,
        axis: entry.axis,
        displayOrder: entry.displayOrder,
      };
    });
  }
}
