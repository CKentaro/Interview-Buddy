import type { Question } from "./Question.entity";

/**
 * 回答後に「次に何をするか」を表すドメインの判定結果（値オブジェクト）。
 *
 * - followup: 同じ MainQuestion をさらに深掘りする
 * - next_main: 次の MainQuestion へ進む（その質問を同梱する）
 * - complete: 出題すべき MainQuestion が尽きたので面接を終了する
 *
 * 「次へ進むのに質問が無い」といった矛盾した状態を型で表現できないよう、
 * next_main のときだけ nextMainQuestion を必須にしている。
 */
export type NextStepDecision =
  | { action: "followup" }
  | { action: "next_main"; nextMainQuestion: Question }
  | { action: "complete" };
