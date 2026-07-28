import { describe, expect, it } from "vitest";

import { EvaluationAxis } from "@/domain/interview/model/EvaluationAxis.vo";
import type { FollowUpGenerationContext } from "@/domain/interview/ports/IFollowUpQuestionService";
import { AXIS_PROBING_ANGLES, buildFollowUpPrompt } from "./followUpPrompts";

function makeContext(
  overrides?: Partial<FollowUpGenerationContext>,
): FollowUpGenerationContext {
  return {
    parentMainQuestionText: "あなたの強みを教えてください。",
    axis: EvaluationAxis.SELF_AWARENESS,
    conversationHistory: [
      {
        questionId: "q-1",
        questionText: "あなたの強みを教えてください。",
        answerText: "行動力があるところです。",
      },
    ],
    interviewerType: "neutral",
    ...overrides,
  };
}

describe("AXIS_PROBING_ANGLES", () => {
  it("全4軸に深掘りの角度が優先順で定義されている", () => {
    for (const axis of Object.values(EvaluationAxis)) {
      expect(AXIS_PROBING_ANGLES[axis].length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("buildFollowUpPrompt", () => {
  it("軸に対応する角度リストを優先順で含む（自己認識→他者視点が先頭）", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("## この軸で優先する深掘りの角度（優先順）");
    expect(prompt).toContain("1. 他者視点");
    expect(prompt).toContain("2. 具体化・詳細化");
    expect(prompt).toContain("3. 障害・葛藤");
  });

  it("軸が変われば角度リストも変わる（価値観・判断→代替案・比較が先頭）", () => {
    const prompt = buildFollowUpPrompt(
      makeContext({ axis: EvaluationAxis.VALUES_JUDGMENT }),
    );

    expect(prompt).toContain("1. 代替案・比較");
    expect(prompt).not.toContain("1. 他者視点");
  });

  it("直前の深掘りと同じ角度の再利用を禁止する指示を含む", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("直前の深掘りと同じ角度は使わず");
  });

  it("エピソード未提示なら角度より先にエピソードを引き出す段階制御の指示を含む", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("エピソードがまだ出ていない場合は、角度リストより先に");
  });

  it("回答形式の要求ではなく場面・状況を直接尋ねる指示を含む", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("回答の形式を要求する聞き方ではなく");
    expect(prompt).toContain(
      "「エピソード」「具体例」という言葉は使わないでください",
    );
  });

  it("応募者の言葉の引用と、指示語による抽象的な参照の禁止を指示する", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("そのまま引用して質問を組み立ててください");
    expect(prompt).toContain("指示語を質問の前提に使うことは禁止");
    expect(prompt).toContain("まだ話していない場面・状況を、既に語られたかのように前提へ置かないでください");
  });

  it("本質問・やり取り・面接官タイプ別指示のセクションを保つ", () => {
    const prompt = buildFollowUpPrompt(makeContext());

    expect(prompt).toContain("あなたの強みを教えてください。");
    expect(prompt).toContain("行動力があるところです。");
    expect(prompt).toContain("## 面接官タイプ別の指示");
  });
});
