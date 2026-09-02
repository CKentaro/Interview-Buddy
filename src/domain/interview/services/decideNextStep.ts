import type { NextStepDecision } from "../model/NextStepDecision.vo";
import type { Question } from "../model/Question.entity";

/**
 * 1 つの MainQuestion に対して許す深掘り（FollowUpQuestion）の最大回数。
 * ユビキタス言語: 「FollowUpQuestion = 大問への深掘り質問」。
 *
 * depthCount は回答済み質問の深さを表す（MainQuestion=0, 1回目の深掘り=1, 2回目=2）。
 * 普通の既定値。実際の進行では面接長さから解決した値を入力で渡す。
 */
export const MAX_FOLLOW_UP_DEPTH = 2;

export type DecideNextStepInput = {
  /** 回答された質問の深掘り深さ。 */
  answeredQuestionDepthCount: number;
  /** 次に出題できる MainQuestion。無ければ null。 */
  nextMainQuestion: Question | null;
  /** このセッションで許す深掘りの最大段数。 */
  maxFollowUpDepth: number;
};

/**
 * 回答後に次へ何を返すか判定するドメインサービス（純粋関数・副作用なし）。
 *
 * - depthCount < maxFollowUpDepth → 深掘りを続ける（followup）
 * - 上限到達かつ次の MainQuestion あり → 次の MainQuestion へ（next_main）
 * - 上限到達かつ次の MainQuestion なし → 面接終了（complete）
 */
export function decideNextStep(input: DecideNextStepInput): NextStepDecision {
  if (input.answeredQuestionDepthCount < input.maxFollowUpDepth) {
    return { action: "followup" };
  }

  if (input.nextMainQuestion !== null) {
    return { action: "next_main", nextMainQuestion: input.nextMainQuestion };
  }

  return { action: "complete" };
}
