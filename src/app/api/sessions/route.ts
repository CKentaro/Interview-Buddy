import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import { toApiQuestionType, toSessionListItem } from "@/app/api/sessionPresenter";
import type {
  QuestionResponse,
  SessionListResponse,
  SessionResponse,
} from "@/app/api/types";
import { GetInterviewHistoryUseCase } from "@/application/interview/GetInterviewHistoryUseCase";
import { StartInterviewUseCase } from "@/application/interview/StartInterviewUseCase";
import { INTERVIEWER_TYPES } from "@/domain/interview/model/InterviewerType.vo";
import { GeminiOpeningSpeechService } from "@/infrastructure/ai/GeminiOpeningSpeechService";
import { JsonQuestionBankProvider } from "@/infrastructure/questionBank/JsonQuestionBankProvider";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

const createSessionSchema = z
  .object({
    companyName: z.string().optional(),
    industryMajor: z.string().optional(),
    industryMinor: z.string().optional(),
    jobMajor: z.string().optional(),
    jobMinor: z.string().optional(),
    selectionStage: z.string().optional(),
    interviewerType: z.enum(INTERVIEWER_TYPES).optional(),
    voiceEnabled: z.boolean().optional(),
  })
  .strict();

/** POST /api/sessions — 面接セッションを作成し、最初の質問を返す。 */
export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Bad Request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const useCase = new StartInterviewUseCase(
      new JsonQuestionBankProvider(),
      new PrismaInterviewSessionRepository(),
      new GeminiOpeningSpeechService(),
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

    return Response.json(response, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "POST /api/sessions");
  }
}

/** GET /api/sessions — 本人の完了済み面接の一覧（新しい順）を返す。 */
export async function GET(): Promise<Response> {
  try {
    const userId = await requireUser();

    const useCase = new GetInterviewHistoryUseCase(
      new PrismaInterviewSessionRepository(),
    );
    const sessions = await useCase.execute(userId);

    const response: SessionListResponse = {
      sessions: sessions.map(toSessionListItem),
    };
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error, "GET /api/sessions");
  }
}
