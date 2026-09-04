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
import { INTERVIEW_LENGTH_VALUES } from "@/domain/interview/model/InterviewLength.vo";
import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import {
  EmploymentKind,
  JobPostingPageKind,
} from "@/domain/interview/model/JobPosting.vo";
import { GeminiMainQuestionService } from "@/infrastructure/ai/GeminiMainQuestionService";
import { GeminiOpeningSpeechService } from "@/infrastructure/ai/GeminiOpeningSpeechService";
import { JsonQuestionBankProvider } from "@/infrastructure/questionBank/JsonQuestionBankProvider";
import { PrismaInterviewSessionRepository } from "@/infrastructure/prisma/PrismaInterviewSessionRepository";
import { requireUser } from "@/lib/auth-guard";

/**
 * クライアントから返ってくる求人解析結果。
 *
 * NOTE: 解析結果をサーバーに保存せずクライアント経由で受け取るため、内容は
 * 信頼できない。文字列長を制限し、質問生成のプロンプトへ無制限のテキストを
 * 差し込まれないようにする。
 */
const MAX_SUMMARY_LENGTH = 600;
const MAX_KEY_POINTS = 5;

const jobPostingSchema = z
  .object({
    pageKind: z.enum(JobPostingPageKind),
    usableAsContext: z.boolean(),
    employmentKind: z.enum(EmploymentKind),
    companyName: z.string().max(200).nullable(),
    industryMajor: z.string().max(100).nullable(),
    industryMinor: z.string().max(100).nullable(),
    jobMajor: z.string().max(100).nullable(),
    jobMinor: z.string().max(100).nullable(),
    businessSummary: z.string().max(MAX_SUMMARY_LENGTH).nullable(),
    jobSummary: z.string().max(MAX_SUMMARY_LENGTH).nullable(),
    keyPoints: z.array(z.string().max(MAX_SUMMARY_LENGTH)).max(MAX_KEY_POINTS),
  })
  // 解析レスポンスをそのまま渡せるよう、UI 用の項目（status / finalUrl）は許して捨てる。
  .loose();

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
    interviewLength: z.enum(INTERVIEW_LENGTH_VALUES).optional(),
    jobPosting: jobPostingSchema.optional(),
    generateQuestionsFromJobPosting: z.boolean().optional(),
    // 「同じ設定でもう一度」で大問を引き継ぐ元セッション。所有チェックと軸構成の
    // 一致確認はユースケース側で行うため、ここでは長さだけ縛る（cuid 相当）。
    reuseQuestionsFromSessionId: z.string().min(1).max(64).optional(),
  })
  .strict();

/** DTO の平坦な業界・職種を、ドメインの組へ戻す。 */
function toJobPostingContext(
  dto: z.infer<typeof jobPostingSchema>,
): JobPostingContext {
  return {
    pageKind: dto.pageKind,
    usableAsContext: dto.usableAsContext,
    employmentKind: dto.employmentKind,
    companyName: dto.companyName,
    industry:
      dto.industryMajor && dto.industryMinor
        ? { major: dto.industryMajor, minor: dto.industryMinor }
        : null,
    job:
      dto.jobMajor && dto.jobMinor
        ? { major: dto.jobMajor, minor: dto.jobMinor }
        : null,
    businessSummary: dto.businessSummary,
    jobSummary: dto.jobSummary,
    keyPoints: dto.keyPoints,
  };
}

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
      new GeminiMainQuestionService(),
    );
    const { jobPosting, ...rest } = parsed.data;
    const result = await useCase.execute({
      userId,
      ...rest,
      jobPosting: jobPosting ? toJobPostingContext(jobPosting) : undefined,
    });

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
      interviewLength: result.session.interviewLength,
      totalQuestionCount: result.totalQuestionCount,
      firstQuestion,
      voiceEnabled: result.voiceEnabled,
      questionsGeneratedFromJobPosting: result.questionsGeneratedFromJobPosting,
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
