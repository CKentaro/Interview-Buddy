import type { Question } from "@/domain/interview/model/Question.entity";
import { QuestionType } from "@/domain/interview/model/QuestionType.vo";
import {
  DuplicateAnswerError,
  type IInterviewSessionRepository,
  type QuestionAnswerPair,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IFollowUpQuestionService } from "@/domain/interview/ports/IFollowUpQuestionService";
import type { IQuestionSpeechService } from "@/domain/interview/ports/IQuestionSpeechService";
import { decideNextStep } from "@/domain/interview/services/decideNextStep";
import { SessionNotFoundError } from "./errors";

// interview 文脈で共有する SessionNotFoundError を再輸出する（このモジュール経由の
// 既存 import 経路を維持しつつ、クラス定義は application/interview/errors.ts に一本化）。
export { SessionNotFoundError };

export type AnswerQuestionInput = {
  userId: string;
  sessionId: string;
  questionId: string;
  answerText: string;
  voiceEnabled?: boolean;
};

export type AnswerQuestionResult =
  | {
      action: "followup";
      answerId: string;
      nextQuestion: Question;
      speechText: string;
    }
  | {
      action: "next_main";
      answerId: string;
      nextQuestion: Question;
      speechText: string;
    }
  | { action: "complete"; answerId: string };

export class QuestionNotFoundError extends Error {
  constructor(questionId: string) {
    super(`Question not found: ${questionId}`);
    this.name = "QuestionNotFoundError";
  }
}

export class QuestionAlreadyAnsweredError extends Error {
  constructor(questionId: string) {
    super(`Question already answered: ${questionId}`);
    this.name = "QuestionAlreadyAnsweredError";
  }
}

export class InvalidQuestionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidQuestionStateError";
  }
}

export class FollowUpQuestionGenerationError extends Error {
  constructor(cause: unknown) {
    super("Follow-up question generation failed");
    this.name = "FollowUpQuestionGenerationError";
    this.cause = cause;
  }
}

/**
 * UC03「質問に回答する」のユースケース。
 *
 * 回答後の進行を組み立てる。分岐判定そのものは decideNextStep に委譲し、
 * DB と LLM の詳細は port 越しに扱う。
 */
export class AnswerQuestionUseCase {
  constructor(
    private readonly sessionRepository: IInterviewSessionRepository,
    private readonly followUpQuestionService: IFollowUpQuestionService,
    private readonly questionSpeechService?: IQuestionSpeechService,
  ) {}

  async execute(input: AnswerQuestionInput): Promise<AnswerQuestionResult> {
    const session = await this.sessionRepository.findSessionByIdForUser(
      input.sessionId,
      input.userId,
    );
    if (session === null) {
      throw new SessionNotFoundError(input.sessionId);
    }
    if (session.endedAt !== null) {
      throw new InvalidQuestionStateError(
        `Session ${input.sessionId} is already completed`,
      );
    }

    const answeredQuestion =
      await this.sessionRepository.findQuestionByIdInSession(
        input.sessionId,
        input.questionId,
      );
    if (answeredQuestion === null) {
      throw new QuestionNotFoundError(input.questionId);
    }

    if (await this.sessionRepository.hasAnswerForQuestion(input.questionId)) {
      throw new QuestionAlreadyAnsweredError(input.questionId);
    }

    const parentMainQuestion = await this.resolveParentMainQuestion(
      input.sessionId,
      answeredQuestion,
    );
    const nextMainQuestion = await this.sessionRepository.findNextMainQuestion(
      input.sessionId,
      parentMainQuestion.displayOrder,
    );
    const decision = decideNextStep({
      answeredQuestionDepthCount: answeredQuestion.depthCount,
      nextMainQuestion,
    });

    switch (decision.action) {
      case "followup":
        return this.answerWithFollowUp(input, parentMainQuestion, answeredQuestion);
      case "next_main":
        return this.answerWithNextMain(input, answeredQuestion, decision.nextMainQuestion);
      case "complete":
        return this.answerAndComplete(input);
    }
  }

  private async resolveParentMainQuestion(
    sessionId: string,
    answeredQuestion: Question,
  ): Promise<Question> {
    if (answeredQuestion.type === QuestionType.MAIN) {
      return answeredQuestion;
    }

    if (answeredQuestion.parentQuestionId === null) {
      throw new InvalidQuestionStateError(
        `FollowUpQuestion ${answeredQuestion.id} has no parentQuestionId`,
      );
    }

    const parent = await this.sessionRepository.findQuestionByIdInSession(
      sessionId,
      answeredQuestion.parentQuestionId,
    );
    if (parent === null) {
      throw new InvalidQuestionStateError(
        `Parent MainQuestion ${answeredQuestion.parentQuestionId} not found`,
      );
    }
    if (parent.type !== QuestionType.MAIN) {
      throw new InvalidQuestionStateError(
        `Parent question ${parent.id} is not a MainQuestion`,
      );
    }

    return parent;
  }

  private async answerWithFollowUp(
    input: AnswerQuestionInput,
    parentMainQuestion: Question,
    answeredQuestion: Question,
  ): Promise<AnswerQuestionResult> {
    if (parentMainQuestion.primaryAxis === null) {
      throw new InvalidQuestionStateError(
        `MainQuestion ${parentMainQuestion.id} has no primaryAxis`,
      );
    }

    const currentHistory = await this.sessionRepository.findConversationHistory(
      input.sessionId,
      parentMainQuestion.id,
    );
    const conversationHistory = this.withSubmittedAnswer(
      currentHistory,
      answeredQuestion,
      input.answerText,
    );

    let generated: { displayText: string; speechText?: string };
    try {
      generated = await this.followUpQuestionService.generate({
        parentMainQuestionText: parentMainQuestion.content,
        axis: parentMainQuestion.primaryAxis,
        conversationHistory,
      });
    } catch (error) {
      throw new FollowUpQuestionGenerationError(error);
    }

    const displayText = generated.displayText.trim();
    if (displayText.length === 0) {
      throw new FollowUpQuestionGenerationError(
        new Error("Generated displayText is empty"),
      );
    }

    const maxDisplayOrder = await this.sessionRepository.getMaxDisplayOrder(
      input.sessionId,
    );
    const { answer, followUpQuestion } = await this.mapDuplicateAnswerError(
      input.questionId,
      () =>
        this.sessionRepository.saveAnswerAndCreateFollowUpQuestion({
          answer: { questionId: input.questionId, content: input.answerText },
          followUpQuestion: {
            sessionId: input.sessionId,
            parentMainQuestionId: parentMainQuestion.id,
            content: displayText,
            displayOrder: maxDisplayOrder + 1,
            depthCount: answeredQuestion.depthCount + 1,
            primaryAxis: parentMainQuestion.primaryAxis,
          },
        }),
    );

    return {
      action: "followup",
      answerId: answer.id,
      nextQuestion: followUpQuestion,
      speechText: this.speechOrFallback(generated.speechText, displayText),
    };
  }

  private async answerWithNextMain(
    input: AnswerQuestionInput,
    answeredQuestion: Question,
    nextMainQuestion: Question,
  ): Promise<AnswerQuestionResult> {
    const speechText = await this.generateNextMainSpeech(
      input,
      answeredQuestion,
      nextMainQuestion,
    );
    const answer = await this.mapDuplicateAnswerError(input.questionId, () =>
      this.sessionRepository.saveAnswer(input.questionId, input.answerText),
    );

    return {
      action: "next_main",
      answerId: answer.id,
      nextQuestion: nextMainQuestion,
      speechText,
    };
  }

  private async answerAndComplete(
    input: AnswerQuestionInput,
  ): Promise<AnswerQuestionResult> {
    const answer = await this.mapDuplicateAnswerError(input.questionId, () =>
      this.sessionRepository.saveAnswerAndCompleteSession({
        sessionId: input.sessionId,
        answer: { questionId: input.questionId, content: input.answerText },
      }),
    );

    return { action: "complete", answerId: answer.id };
  }

  private withSubmittedAnswer(
    history: QuestionAnswerPair[],
    answeredQuestion: Question,
    answerText: string,
  ): QuestionAnswerPair[] {
    let found = false;
    const updated = history.map((pair) => {
      if (pair.questionId !== answeredQuestion.id) {
        return pair;
      }
      found = true;
      return { ...pair, answerText };
    });

    if (found) {
      return updated;
    }

    return [
      ...updated,
      {
        questionId: answeredQuestion.id,
        questionText: answeredQuestion.content,
        answerText,
      },
    ];
  }

  private async generateNextMainSpeech(
    input: AnswerQuestionInput,
    answeredQuestion: Question,
    nextMainQuestion: Question,
  ): Promise<string> {
    if (!input.voiceEnabled || this.questionSpeechService === undefined) {
      return nextMainQuestion.content;
    }

    try {
      const generated = await this.questionSpeechService.generate({
        displayText: nextMainQuestion.content,
        previousQuestionText: answeredQuestion.content,
        previousAnswerText: input.answerText,
      });
      return this.speechOrFallback(generated, nextMainQuestion.content);
    } catch {
      return nextMainQuestion.content;
    }
  }

  private speechOrFallback(
    speechText: string | undefined,
    fallback: string,
  ): string {
    const normalized = speechText?.trim();
    return normalized && normalized.length > 0 ? normalized : fallback;
  }

  private async mapDuplicateAnswerError<T>(
    questionId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DuplicateAnswerError) {
        throw new QuestionAlreadyAnsweredError(questionId);
      }
      throw error;
    }
  }
}
