import { after } from "next/server";
import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import { toApiQuestionType } from "@/app/api/sessionPresenter";
import {
  AnswerQuestionUseCase,
  type AnswerQuestionResult,
  FollowUpQuestionGenerationError,
  InvalidQuestionStateError,
  QuestionAlreadyAnsweredError,
  QuestionNotFoundError,
  SessionNotFoundError,
} from "@/application/interview/AnswerQuestionUseCase";
import { GenerateFeedbackUseCase } from "@/application/feedback/GenerateFeedbackUseCase";
import type { AnswerResponse, SubmitAnswerRequest } from "@/app/api/types";
import { GeminiFeedbackService } from "@/infrastructure/ai/GeminiFeedbackService";
import { GeminiFollowUpQuestionService } from "@/infrastructure/ai/GeminiFollowUpQuestionService";
import { GeminiQuestionSpeechService } from "@/infrastructure/ai/GeminiQuestionSpeechService";
import { PrismaFeedbackContextProvider } from "@/infrastructure/prisma/PrismaFeedbackContextProvider";
import { PrismaFeedbackRepository } from "@/infrastructure/prisma/PrismaFeedbackRepository";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

const submitAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    answerText: z.string().min(1),
    voiceEnabled: z.boolean().optional(),
  })
  .strict();

function toAnswerResponse(result: AnswerQuestionResult): AnswerResponse {
  if (result.action === "complete") {
    return {
      answerId: result.answerId,
      isSessionComplete: true,
      nextQuestion: null,
    };
  }

  return {
    answerId: result.answerId,
    isSessionComplete: false,
    nextQuestion: {
      id: result.nextQuestion.id,
      type: toApiQuestionType(result.nextQuestion.type),
      text: result.nextQuestion.content,
      parentQuestionId: result.nextQuestion.parentQuestionId,
      speechText: result.speechText,
    },
  };
}

function scheduleFeedbackGeneration(sessionId: string): void {
  // 面接完了時にフィードバック生成をレスポンス後へ予約する（POST /feedback/generate と同じ経路）。
  // 二重生成ガードは UseCase 側にあり、失敗は伝搬させずログのみ（ポーリングで failed 判定される）。
  const useCase = new GenerateFeedbackUseCase(
    new PrismaFeedbackContextProvider(),
    new GeminiFeedbackService(),
    new PrismaFeedbackRepository(),
  );
  after(async () => {
    try {
      await useCase.execute(sessionId);
    } catch (error) {
      console.error(
        `Feedback generation failed for session ${sessionId}:`,
        error,
      );
    }
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await requireUser();
    const { id: sessionId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = submitAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Bad Request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const requestBody: SubmitAnswerRequest = parsed.data;
    const useCase = new AnswerQuestionUseCase(
      new PrismaInterviewSessionRepository(),
      new GeminiFollowUpQuestionService(),
      new GeminiQuestionSpeechService(),
    );

    const result = await useCase.execute({
      userId,
      sessionId,
      questionId: requestBody.questionId,
      answerText: requestBody.answerText,
      voiceEnabled: requestBody.voiceEnabled,
    });

    if (result.action === "complete") {
      scheduleFeedbackGeneration(sessionId);
    }

    return Response.json(toAnswerResponse(result), { status: 201 });
  } catch (error) {
    // 回答フロー固有の例外を先に処理し、残り（未認証・想定外）は共通ヘルパへ委譲する。
    if (
      error instanceof SessionNotFoundError ||
      error instanceof QuestionNotFoundError
    ) {
      return jsonError("Not Found", 404);
    }
    if (
      error instanceof QuestionAlreadyAnsweredError ||
      error instanceof InvalidQuestionStateError
    ) {
      return jsonError("Conflict", 409);
    }
    if (error instanceof FollowUpQuestionGenerationError) {
      return jsonError(
        "質問の生成に失敗しました。もう一度お試しください。",
        502,
      );
    }
    return toErrorResponse(error, "POST /api/sessions/[id]/answers");
  }
}
