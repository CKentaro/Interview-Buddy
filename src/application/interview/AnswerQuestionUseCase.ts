import { decideNextStep } from "@/domain/interview/services/decideNextStep";
import type { IFollowUpQuestionService } from "@/domain/interview/ports/IFollowUpQuestionService";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import type { Question } from "@/domain/interview/model/Question";
import { isMainQuestion } from "@/domain/interview/model/Question";

/** ユースケースの入力。 */
export type AnswerQuestionInput = {
  sessionId: string;
  questionId: string;
  answerText: string;
};

/**
 * ユースケースの出力（プレゼンテーション層が API レスポンスへ詰め替える）。
 * API のレスポンス型そのものではなく、ドメイン寄りの結果を返す。
 */
export type AnswerQuestionResult =
  | { action: "followup"; answerId: string; nextQuestion: Question }
  | { action: "next_main"; answerId: string; nextQuestion: Question }
  | { action: "complete"; answerId: string };

/** 回答対象の質問が存在しないときに投げる。 */
export class QuestionNotFoundError extends Error {
  constructor(questionId: string) {
    super(`Question not found: ${questionId}`);
    this.name = "QuestionNotFoundError";
  }
}

/** 親 MainQuestion を辿れないなど、データの整合が崩れているときに投げる。 */
export class InvalidQuestionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuestionStateError";
  }
}

/**
 * UC03「質問に回答する」のユースケース。
 *
 * Route Handler から Prisma や Gemini を直接呼ばず、本クラスが
 * リポジトリ（永続化）と深掘り生成サービスを束ねて処理の流れを組み立てる。
 * 「次に何をするか」の判定は decideNextStep（ドメインサービス）に委譲する。
 */
export class AnswerQuestionUseCase {
  constructor(
    private readonly sessionRepository: IInterviewSessionRepository,
    private readonly followUpQuestionService: IFollowUpQuestionService,
  ) {}

  async execute(input: AnswerQuestionInput): Promise<AnswerQuestionResult> {
    const answeredQuestion = await this.sessionRepository.findQuestionById(
      input.questionId,
    );
    if (answeredQuestion === null) {
      throw new QuestionNotFoundError(input.questionId);
    }

    // 親 MainQuestion を特定する（回答が MainQuestion ならそれ自身）。
    const parentMainQuestion = await this.resolveParentMainQuestion(
      answeredQuestion,
    );

    // 次の MainQuestion を先に引いてから判定する（判定を純粋関数に保つため）。
    const nextMainQuestion = await this.sessionRepository.findNextMainQuestion(
      input.sessionId,
      parentMainQuestion.displayOrder,
    );

    const decision = decideNextStep({
      answeredQuestionDepthCount: answeredQuestion.depthCount,
      nextMainQuestion,
    });

    // 回答の保存は分岐に関わらず行う。
    const answer = await this.sessionRepository.saveAnswer(
      input.questionId,
      input.answerText,
    );

    switch (decision.action) {
      case "followup": {
        const nextQuestion = await this.createFollowUpQuestion(
          input.sessionId,
          parentMainQuestion,
          answeredQuestion,
        );
        return { action: "followup", answerId: answer.id, nextQuestion };
      }
      case "next_main":
        return {
          action: "next_main",
          answerId: answer.id,
          nextQuestion: decision.nextMainQuestion,
        };
      case "complete":
        await this.sessionRepository.completeSession(input.sessionId);
        return { action: "complete", answerId: answer.id };
    }
  }

  private async resolveParentMainQuestion(
    answeredQuestion: Question,
  ): Promise<Question> {
    if (isMainQuestion(answeredQuestion)) {
      return answeredQuestion;
    }
    if (answeredQuestion.parentQuestionId === null) {
      throw new InvalidQuestionStateError(
        `FollowUp question ${answeredQuestion.id} has no parentQuestionId`,
      );
    }
    const parent = await this.sessionRepository.findQuestionById(
      answeredQuestion.parentQuestionId,
    );
    if (parent === null) {
      throw new InvalidQuestionStateError(
        `Parent main question ${answeredQuestion.parentQuestionId} not found`,
      );
    }
    return parent;
  }

  private async createFollowUpQuestion(
    sessionId: string,
    parentMainQuestion: Question,
    answeredQuestion: Question,
  ): Promise<Question> {
    // MainQuestion は評価軸を必ず持つ前提（深掘り生成に必要）。
    if (parentMainQuestion.primaryAxis === null) {
      throw new InvalidQuestionStateError(
        `Main question ${parentMainQuestion.id} has no primaryAxis`,
      );
    }

    const conversationHistory =
      await this.sessionRepository.findConversationHistory(
        sessionId,
        parentMainQuestion.id,
      );

    const generated = await this.followUpQuestionService.generate({
      parentMainQuestionText: parentMainQuestion.content,
      axis: parentMainQuestion.primaryAxis,
      conversationHistory,
    });

    const maxDisplayOrder =
      await this.sessionRepository.getMaxDisplayOrder(sessionId);

    return this.sessionRepository.createFollowUpQuestion({
      sessionId,
      parentMainQuestionId: parentMainQuestion.id,
      content: generated.displayText,
      displayOrder: maxDisplayOrder + 1,
      depthCount: answeredQuestion.depthCount + 1,
      primaryAxis: parentMainQuestion.primaryAxis,
    });
  }
}
