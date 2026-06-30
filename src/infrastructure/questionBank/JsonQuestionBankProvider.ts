import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import type {
  BankAxis,
  QuestionBank,
} from "@/domain/interview/model/QuestionBank";
import type { RawBankAxis, RawQuestionBank } from "./questionBank";
import bankJson from "./questionBank.json";

/** JSON 上の評価軸文字列 → ドメインの EvaluationAxis。 */
const AXIS_TO_DOMAIN: Record<string, EvaluationAxis> = {
  REPRODUCIBILITY: EvaluationAxis.REPRODUCIBILITY,
  VALUES_JUDGMENT: EvaluationAxis.VALUES_JUDGMENT,
  SELF_AWARENESS: EvaluationAxis.SELF_AWARENESS,
  WORLDVIEW: EvaluationAxis.WORLDVIEW,
};

function toDomainAxis(raw: RawBankAxis): BankAxis {
  const axis = AXIS_TO_DOMAIN[raw.axis];
  if (axis === undefined) {
    throw new Error(`Unknown evaluation axis in question bank: ${raw.axis}`);
  }
  return { axis, questions: raw.questions };
}

/**
 * IQuestionBankProvider の JSON 実装。
 * `src/infrastructure/questionBank/questionBank.json` を読み込み、
 * ドメインの QuestionBank へ変換する。
 */
export class JsonQuestionBankProvider implements IQuestionBankProvider {
  load(): QuestionBank {
    const raw = bankJson as RawQuestionBank;
    return {
      values: toDomainAxis(raw.values),
      reproducibility: toDomainAxis(raw.reproducibility),
      selfAwareness: toDomainAxis(raw.selfAwareness),
      worldview: toDomainAxis(raw.worldview),
    };
  }
}
