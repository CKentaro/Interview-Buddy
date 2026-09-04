import { describe, expect, it } from "vitest";

import { QuestionType } from "../model/QuestionType.vo";
import type { SessionQuestionWithAnswer } from "../ports/IInterviewSessionRepository";
import { resolveResumePosition } from "./resolveResumePosition";

function question(
  id: string,
  type: QuestionType,
  displayOrder: number,
  answered: boolean,
): SessionQuestionWithAnswer {
  return {
    id,
    type,
    content: id,
    displayOrder,
    primaryAxis: null,
    parentQuestionId: type === QuestionType.FOLLOW_UP ? "main-1" : null,
    answer: answered ? { id: `answer-${id}`, content: "回答" } : null,
  };
}

describe("resolveResumePosition", () => {
  it("未回答の本質問より、進行中に追加された未回答の深掘り質問を優先する", () => {
    const position = resolveResumePosition([
      question("main-1", QuestionType.MAIN, 1, true),
      question("main-2", QuestionType.MAIN, 2, false),
      question("main-3", QuestionType.MAIN, 3, false),
      question("follow-1", QuestionType.FOLLOW_UP, 6, false),
    ]);

    expect(position?.question.id).toBe("follow-1");
    expect(position?.questionNumber).toBe(2);
  });

  it("未回答の深掘り質問がなければ最初の未回答本質問を返す", () => {
    const position = resolveResumePosition([
      question("main-1", QuestionType.MAIN, 1, true),
      question("main-2", QuestionType.MAIN, 2, false),
      question("follow-1", QuestionType.FOLLOW_UP, 6, true),
    ]);

    expect(position?.question.id).toBe("main-2");
    expect(position?.questionNumber).toBe(3);
  });

  it("全質問が回答済みなら null を返す", () => {
    expect(
      resolveResumePosition([
        question("main-1", QuestionType.MAIN, 1, true),
        question("follow-1", QuestionType.FOLLOW_UP, 6, true),
      ]),
    ).toBeNull();
  });
});
