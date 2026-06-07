import type { EvaluationAxis } from "@/generated/prisma/enums";

export type NextMainQuestion = {
  id: string;
  content: string;
  displayOrder: number;
  primaryAxis: EvaluationAxis | null;
};

export type DecisionInput = {
  answeredQuestionDepthCount: number;
  nextMainQuestion: NextMainQuestion | null;
};

export type DecisionResult =
  | { action: "followup" }
  | { action: "next_main"; question: NextMainQuestion }
  | { action: "complete" };

/**
 * 回答後に次に何を返すか判定する純粋関数。
 *
 * - depthCount < 2 → 深掘り質問を生成（followup）
 * - depthCount >= 2 かつ次メインあり → 次のメイン質問へ（next_main）
 * - depthCount >= 2 かつ次メインなし → 面接終了（complete）
 */
export function decideNextStep(input: DecisionInput): DecisionResult {
  if (input.answeredQuestionDepthCount < 2) {
    return { action: "followup" };
  }
  if (input.nextMainQuestion !== null) {
    return { action: "next_main", question: input.nextMainQuestion };
  }
  return { action: "complete" };
}
