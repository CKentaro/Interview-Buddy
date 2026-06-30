import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import type {
  BankAxis,
  QuestionBank,
} from "@/domain/interview/model/QuestionBank";
import type { RawBankAxis, RawQuestionBank } from "./questionBank";
import bankJson from "./questionBank.json";

/** EvaluationAxis の妥当な値集合（JSON 文字列の検証に使う）。 */
const DOMAIN_AXES = new Set<string>(Object.values(EvaluationAxis));

function toDomainAxis(raw: RawBankAxis): BankAxis {
  if (!DOMAIN_AXES.has(raw.axis)) {
    throw new Error(`Unknown evaluation axis in question bank: ${raw.axis}`);
  }
  // 値は EvaluationAxis のメンバーであることを上で検証済み。
  return { axis: raw.axis as EvaluationAxis, questions: raw.questions };
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
