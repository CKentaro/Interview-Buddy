import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import type {
  BankAxis,
  BankQuestion,
  QuestionBank,
} from "@/domain/interview/model/QuestionBank";
import bankJson from "@/data/questionBank.json";

/** JSON 上の評価軸文字列 → ドメインの EvaluationAxis。 */
const AXIS_TO_DOMAIN: Record<string, EvaluationAxis> = {
  REPRODUCIBILITY: EvaluationAxis.REPRODUCIBILITY,
  VALUES_JUDGMENT: EvaluationAxis.VALUES_JUDGMENT,
  SELF_AWARENESS: EvaluationAxis.SELF_AWARENESS,
  WORLDVIEW: EvaluationAxis.WORLDVIEW,
};

type JsonBankAxis = {
  axis: string;
  questions: BankQuestion[];
};

type JsonQuestionBank = {
  values: JsonBankAxis;
  reproducibility: JsonBankAxis;
  selfAwareness: JsonBankAxis;
  worldview: JsonBankAxis;
};

function toDomainAxis(raw: JsonBankAxis): BankAxis {
  const axis = AXIS_TO_DOMAIN[raw.axis];
  if (axis === undefined) {
    throw new Error(`Unknown evaluation axis in question bank: ${raw.axis}`);
  }
  return { axis, questions: raw.questions };
}

/**
 * IQuestionBankProvider の JSON 実装。
 * `src/data/questionBank.json` を読み込み、ドメインの QuestionBank へ変換する。
 */
export class JsonQuestionBankProvider implements IQuestionBankProvider {
  load(): QuestionBank {
    const raw = bankJson as JsonQuestionBank;
    return {
      values: toDomainAxis(raw.values),
      reproducibility: toDomainAxis(raw.reproducibility),
      selfAwareness: toDomainAxis(raw.selfAwareness),
      worldview: toDomainAxis(raw.worldview),
    };
  }
}
