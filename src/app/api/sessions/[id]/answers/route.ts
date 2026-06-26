import { NextResponse } from "next/server";

import {
  AnswerQuestionUseCase,
  type AnswerQuestionResult,
  InvalidQuestionStateError,
  QuestionNotFoundError,
} from "@/application/interview/AnswerQuestionUseCase";
import { requireUser, UnauthorizedError } from "@/lib/auth-guard";
import { GeminiFollowUpQuestionService } from "@/infrastructure/ai/GeminiFollowUpQuestionService";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import type { AnswerResponse, SubmitAnswerRequest } from "@/types/api";

/** ドメインのユースケース結果を API レスポンス型へ詰め替える。 */
function toAnswerResponse(result: AnswerQuestionResult): AnswerResponse {
  if (result.action === "complete") {
    return { answerId: result.answerId, isSessionComplete: true, nextQuestion: null };
  }
  return {
    answerId: result.answerId,
    isSessionComplete: false,
    nextQuestion: {
      id: result.nextQuestion.id,
      type: result.nextQuestion.type,
      text: result.nextQuestion.content,
      parentQuestionId: result.nextQuestion.parentQuestionId,
    },
  };
}

/**
 * UC03: 質問に回答する。
 *
 * Route Handler は「入力の取り出し → UseCase 実行 → レスポンス整形」に徹し、
 * Prisma / Gemini を直接呼ばない（DDD ガイドの実装ルール）。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireUser();
    const { id: sessionId } = await params;
    const body = (await request.json()) as SubmitAnswerRequest;

    const useCase = new AnswerQuestionUseCase(
      new PrismaInterviewSessionRepository(),
      new GeminiFollowUpQuestionService(),
    );

    const result = await useCase.execute({
      sessionId,
      questionId: body.questionId,
      answerText: body.answerText,
    });

    return NextResponse.json(toAnswerResponse(result), { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof QuestionNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InvalidQuestionStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("AnswerQuestion failed:", err);
    return NextResponse.json(
      { error: "回答の処理に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
