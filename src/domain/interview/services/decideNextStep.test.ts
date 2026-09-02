import { describe, expect, it } from "vitest";

import { decideNextStep, MAX_FOLLOW_UP_DEPTH } from "./decideNextStep";
import { EvaluationAxis } from "../model/EvaluationAxis.vo";
import type { Question } from "../model/Question.entity";
import { QuestionType } from "../model/QuestionType.vo";

const nextMain: Question = {
  id: "q-main-2",
  type: QuestionType.MAIN,
  content: "次のメイン質問",
  displayOrder: 2,
  depthCount: 0,
  primaryAxis: EvaluationAxis.VALUES_JUDGMENT,
  parentQuestionId: null,
};

describe("decideNextStep", () => {
  describe("depthCount が上限未満なら深掘りを続ける（followup）", () => {
    it("depthCount=0 → followup", () => {
      expect(
        decideNextStep({ answeredQuestionDepthCount: 0, nextMainQuestion: nextMain, maxFollowUpDepth: 2 }),
      ).toEqual({ action: "followup" });
    });

    // 境界の内側（=1）。PR #10 の実装はここで next_main へ進めてしまうが、
    // 普通（深掘り2回）では depthCount=1 はまだ followup が正しい。
    it("depthCount=1（上限の1つ手前）→ followup", () => {
      expect(
        decideNextStep({ answeredQuestionDepthCount: 1, nextMainQuestion: nextMain, maxFollowUpDepth: 2 }),
      ).toEqual({ action: "followup" });
    });

    it("負の depthCount でも followup（堅牢性）", () => {
      expect(
        decideNextStep({ answeredQuestionDepthCount: -1, nextMainQuestion: null, maxFollowUpDepth: 2 }),
      ).toEqual({ action: "followup" });
    });
  });

  describe("depthCount が上限以上なら次へ進む", () => {
    it("depthCount=2 かつ 次のメイン質問あり → next_main（質問を同梱）", () => {
      expect(
        decideNextStep({
          answeredQuestionDepthCount: MAX_FOLLOW_UP_DEPTH,
          nextMainQuestion: nextMain,
          maxFollowUpDepth: MAX_FOLLOW_UP_DEPTH,
        }),
      ).toEqual({ action: "next_main", nextMainQuestion: nextMain });
    });

    it("depthCount=2 かつ 次のメイン質問なし → complete", () => {
      expect(
        decideNextStep({
          answeredQuestionDepthCount: MAX_FOLLOW_UP_DEPTH,
          nextMainQuestion: null,
          maxFollowUpDepth: MAX_FOLLOW_UP_DEPTH,
        }),
      ).toEqual({ action: "complete" });
    });

    it("depthCount が上限を超えても次メインがあれば next_main", () => {
      expect(
        decideNextStep({ answeredQuestionDepthCount: 5, nextMainQuestion: nextMain, maxFollowUpDepth: 2 }),
      ).toEqual({ action: "next_main", nextMainQuestion: nextMain });
    });

    it("長めでは depthCount=2 でも深掘りを続ける", () => {
      expect(
        decideNextStep({
          answeredQuestionDepthCount: 2,
          nextMainQuestion: nextMain,
          maxFollowUpDepth: 3,
        }),
      ).toEqual({ action: "followup" });
    });
  });
});
