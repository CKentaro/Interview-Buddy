import { QuestionType } from "../model/QuestionType.vo";
import type { SessionQuestionWithAnswer } from "../ports/IInterviewSessionRepository";

export type ResumePosition = {
  question: SessionQuestionWithAnswer;
  questionNumber: number;
};

/**
 * 保存済みの質問・回答から再開位置を決める。
 *
 * 本質問はセッション開始時に全件作成され、深掘り質問は進行中に末尾へ追加される。
 * そのため単純な displayOrder 順の「最初の未回答」では、未回答の深掘り質問より
 * 次の本質問を先に選ぶ可能性がある。未回答の深掘りを優先し、無ければ次の本質問を選ぶ。
 */
export function resolveResumePosition(
  questions: SessionQuestionWithAnswer[],
): ResumePosition | null {
  const unansweredFollowUp = questions
    .filter(
      (question) =>
        question.type === QuestionType.FOLLOW_UP && question.answer === null,
    )
    .sort((a, b) => b.displayOrder - a.displayOrder)[0];

  const unansweredMain = questions
    .filter(
      (question) =>
        question.type === QuestionType.MAIN && question.answer === null,
    )
    .sort((a, b) => a.displayOrder - b.displayOrder)[0];

  const question = unansweredFollowUp ?? unansweredMain;
  if (!question) {
    return null;
  }

  return {
    question,
    questionNumber:
      questions.filter((candidate) => candidate.answer !== null).length + 1,
  };
}
