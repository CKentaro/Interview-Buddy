import { z } from "zod";

import { jsonError, toErrorResponse } from "@/app/api/httpError";
import type {
  AnalyzeJobPostingResponse,
  JobPostingFailureReason,
} from "@/app/api/types";
import {
  AnalyzeJobPostingUseCase,
  JobPostingExtractionError,
} from "@/application/interview/AnalyzeJobPostingUseCase";
import { JobPostingFetchError } from "@/domain/interview/ports/IJobPostingFetcher";
import { GeminiJobPostingExtractor } from "@/infrastructure/ai/GeminiJobPostingExtractor";
import { HttpJobPostingFetcher } from "@/infrastructure/jobPosting/HttpJobPostingFetcher";
import { requireUser } from "@/lib/auth-guard";

/** URL の最大長。極端に長い入力を解析にかけない。 */
const MAX_URL_LENGTH = 2048;

const analyzeSchema = z
  .object({
    url: z.string().min(1).max(MAX_URL_LENGTH),
  })
  .strict();

function failed(reason: JobPostingFailureReason): Response {
  // 解析できないこと自体は異常ではない（サイト側の WAF・JS 描画・ログイン要求）。
  // 手入力での面接開始は妨げないため、エラーではなく 200 + status:"failed" で返す。
  const response: AnalyzeJobPostingResponse = { status: "failed", reason };
  return Response.json(response);
}

/** POST /api/job-postings/analyze — 求人ページ URL を解析し、設定の自動入力に使う値を返す。 */
export async function POST(request: Request): Promise<Response> {
  try {
    // 解析は外部 fetch と LLM 呼び出しを伴うため、必ずログイン済みに限定する。
    await requireUser();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = analyzeSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Bad Request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const useCase = new AnalyzeJobPostingUseCase(
      new HttpJobPostingFetcher(),
      new GeminiJobPostingExtractor(),
    );

    let result;
    try {
      result = await useCase.execute({ url: parsed.data.url.trim() });
    } catch (error) {
      if (error instanceof JobPostingFetchError) {
        return failed(error.reason);
      }
      if (error instanceof JobPostingExtractionError) {
        console.error("POST /api/job-postings/analyze extraction failed:", error.cause);
        return failed("EXTRACTION_FAILED");
      }
      throw error;
    }

    const { context } = result;
    const response: AnalyzeJobPostingResponse = {
      status: "analyzed",
      finalUrl: result.finalUrl,
      pageKind: context.pageKind,
      usableAsContext: context.usableAsContext,
      employmentKind: context.employmentKind,
      companyName: context.companyName,
      industryMajor: context.industry?.major ?? null,
      industryMinor: context.industry?.minor ?? null,
      jobMajor: context.job?.major ?? null,
      jobMinor: context.job?.minor ?? null,
      businessSummary: context.businessSummary,
      jobSummary: context.jobSummary,
      keyPoints: context.keyPoints,
    };
    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error, "POST /api/job-postings/analyze");
  }
}
