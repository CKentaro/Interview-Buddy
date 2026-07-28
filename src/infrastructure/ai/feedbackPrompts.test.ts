import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import {
  buildAxisEvaluationPrompt,
  buildOverallCommentPrompt,
} from "./feedbackPrompts";

const pairs = [{ questionText: "Q1", answerText: "A1" }];

describe("buildAxisEvaluationPrompt", () => {
  it("率直方針（引用必須・良かった点を無理に作らない・実践アドバイス）を含む", () => {
    const prompt = buildAxisEvaluationPrompt(
      EvaluationAxis.SELF_AWARENESS,
      pairs,
      "neutral",
    );

    expect(prompt).toContain("実際の発言を引用して");
    expect(prompt).toContain("無理に作らない");
    expect(prompt).toContain("次の面接で同じ質問をされたら");
  });

  it("面接官タイプで口調・厳しさの指示が切り替わる", () => {
    const strict = buildAxisEvaluationPrompt(
      EvaluationAxis.SELF_AWARENESS,
      pairs,
      "strict",
    );
    const friendly = buildAxisEvaluationPrompt(
      EvaluationAxis.SELF_AWARENESS,
      pairs,
      "friendly",
    );

    expect(strict).toContain("妥協なく踏み込んで指摘");
    expect(strict).toContain("ふざけた回答");
    expect(friendly).toContain("温かく親しみやすい語りかけ");
    // フレンドリーでも率直さは維持する。
    expect(friendly).toContain("率直さは損なわず");
  });
});

describe("buildOverallCommentPrompt", () => {
  const axisFeedbacks = [
    { axis: EvaluationAxis.REPRODUCIBILITY, comment: "再現性の指摘です" },
  ];

  it("軸別コメントを参照し、重複回避と次回アクションの指示を含む", () => {
    const prompt = buildOverallCommentPrompt(pairs, axisFeedbacks, "neutral");

    expect(prompt).toContain("再現性の指摘です");
    expect(prompt).toContain("既に伝えた個別の指摘は繰り返さない");
    expect(prompt).toContain("回答間の一貫性");
    expect(prompt).toContain("次回の面接までに取り組むべきこと");
  });

  it("面接官タイプの口調・厳しさ指示を含む", () => {
    const prompt = buildOverallCommentPrompt(pairs, axisFeedbacks, "strict");

    expect(prompt).toContain("妥協なく踏み込んで指摘");
  });
});
