import { after, NextResponse } from "next/server";
import { z } from "zod";

import {
  AnswerQuestionUseCase,
  type AnswerQuestionResult,
  FollowUpQuestionGenerationError,
  InvalidQuestionStateError,
  QuestionAlreadyAnsweredError,
  QuestionNotFoundError,
  SessionNotFoundError,
} from "@/application/interview/AnswerQuestionUseCase";
import { QuestionType as DomainQuestionType } from "@/domain/interview/model/QuestionType.vo";
import type { AnswerResponse, SubmitAnswerRequest } from "@/app/api/types";
import { QuestionType as PrismaQuestionType } from "@/generated/prisma/enums";
import { GeminiFollowUpQuestionService } from "@/infrastructure/ai/GeminiFollowUpQuestionService";
import { GeminiQuestionSpeechService } from "@/infrastructure/ai/GeminiQuestionSpeechService";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser, UnauthorizedError } from "@/lib/auth-guard";

const submitAnswerSchema = z
  .object({
    questionId: z.string().min(1),
    answerText: z.string().min(1),
    voiceEnabled: z.boolean().optional(),
  })
  .strict();

function toApiQuestionType(type: DomainQuestionType): PrismaQuestionType {
  return type === DomainQuestionType.MAIN
    ? PrismaQuestionType.MAIN
    : PrismaQuestionType.FOLLOW_UP;
}

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
  after(() => {
    // GenerateFeedbackUseCase is wired in the feedback phase.
    void sessionId;
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const { id: sessionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
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

  try {
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

    return NextResponse.json(toAnswerResponse(result), { status: 201 });
  } catch (error) {
    if (
      error instanceof SessionNotFoundError ||
      error instanceof QuestionNotFoundError
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (
      error instanceof QuestionAlreadyAnsweredError ||
      error instanceof InvalidQuestionStateError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof FollowUpQuestionGenerationError) {
      return NextResponse.json(
        { error: "質問の生成に失敗しました。もう一度お試しください。" },
        { status: 502 },
      );
    }

    console.error("AnswerQuestion failed:", error);
    return NextResponse.json(
      { error: "回答の処理に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
