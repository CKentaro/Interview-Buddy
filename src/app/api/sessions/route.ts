import { NextResponse } from "next/server";
import { z } from "zod";

import { toSessionListItem } from "@/app/api/sessionPresenter";
import type {
  QuestionResponse,
  SessionListResponse,
  SessionResponse,
} from "@/app/api/types";
import { GetInterviewHistoryUseCase } from "@/application/interview/GetInterviewHistoryUseCase";
import { StartInterviewUseCase } from "@/application/interview/StartInterviewUseCase";
import { QuestionType as DomainQuestionType } from "@/domain/interview/model/QuestionType.vo";
import { QuestionType as PrismaQuestionType } from "@/generated/prisma/enums";
import { JsonQuestionBankProvider } from "@/infrastructure/questionBank/JsonQuestionBankProvider";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser, UnauthorizedError } from "@/lib/auth-guard";

const createSessionSchema = z
  .object({
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    industryMajor: z.string().optional(),
    industryMinor: z.string().optional(),
    jobMinor: z.string().optional(),
    selectionStage: z.string().optional(),
    interviewerType: z.string().optional(),
    voiceEnabled: z.boolean().optional(),
  })
  .strict();

function toApiQuestionType(type: DomainQuestionType): PrismaQuestionType {
  return type === DomainQuestionType.MAIN
    ? PrismaQuestionType.MAIN
    : PrismaQuestionType.FOLLOW_UP;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad Request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const useCase = new StartInterviewUseCase(
    new JsonQuestionBankProvider(),
    new PrismaInterviewSessionRepository(),
  );
  const result = await useCase.execute({ userId, ...parsed.data });

  const firstQuestion: QuestionResponse = {
    id: result.firstQuestion.id,
    type: toApiQuestionType(result.firstQuestion.type),
    text: result.firstQuestion.content,
    speechText: result.speechText,
    parentQuestionId: result.firstQuestion.parentQuestionId,
  };
  const response: SessionResponse = {
    sessionId: result.session.id,
    createdAt: result.session.startedAt.toISOString(),
    firstQuestion,
  };

  return NextResponse.json(response, { status: 201 });
}

/** GET /api/sessions — 本人の完了済み面接の一覧（新しい順）を返す。 */
export async function GET(): Promise<NextResponse> {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const useCase = new GetInterviewHistoryUseCase(
    new PrismaInterviewSessionRepository(),
  );
  const sessions = await useCase.execute(userId);

  const response: SessionListResponse = {
    sessions: sessions.map(toSessionListItem),
  };
  return NextResponse.json(response);
}
