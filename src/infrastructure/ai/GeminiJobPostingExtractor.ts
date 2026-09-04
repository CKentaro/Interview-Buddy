import { generateText, Output } from "ai";
import { z } from "zod";

import {
  INDUSTRY_TAXONOMY,
  ROLE_TAXONOMY,
  parseTaxonomyPair,
} from "@/domain/interview/model/careerTaxonomy";
import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import {
  EmploymentKind,
  JobPostingPageKind,
  isUsableAsQuestionContext,
} from "@/domain/interview/model/JobPosting.vo";
import type { IJobPostingExtractor } from "@/domain/interview/ports/IJobPostingExtractor";
import { geminiModel } from "./geminiModel";
import {
  INDUSTRY_CHOICES,
  ROLE_CHOICES,
  buildJobPostingExtractionPrompt,
} from "./jobPostingPrompts";

/** keyPoints として採用する最大件数。 */
const MAX_KEY_POINTS = 5;

// NOTE: 配列に .max() を付けても Gemini は maxItems を守らず、件数超過で
// スキーマ検証ごと失敗する（生成物が丸ごと捨てられる）。件数はプロンプトで
// 指示し、超過分はここで切り詰める。
const extractionSchema = z.object({
  pageKind: z.enum([
    JobPostingPageKind.SINGLE_JOB_POSTING,
    JobPostingPageKind.JOB_LIST,
    JobPostingPageKind.COMPANY_RECRUIT_PAGE,
    JobPostingPageKind.ERROR_OR_LOGIN,
    JobPostingPageKind.OTHER,
  ]),
  usableAsContext: z.boolean(),
  companyName: z.string().nullable(),
  industry: z.enum(INDUSTRY_CHOICES).nullable(),
  job: z.enum(ROLE_CHOICES).nullable(),
  employmentKind: z.enum([
    EmploymentKind.NEW_GRADUATE,
    EmploymentKind.MID_CAREER,
    EmploymentKind.UNKNOWN,
  ]),
  businessSummary: z.string().nullable(),
  jobSummary: z.string().nullable(),
  keyPoints: z.array(z.string()),
});

function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * IJobPostingExtractor の Gemini 実装（Vercel AI SDK / 構造化出力）。
 * プロンプトは {@link ./jobPostingPrompts} に集約する。
 */
export class GeminiJobPostingExtractor implements IJobPostingExtractor {
  async extract(pageText: string): Promise<JobPostingContext> {
    const result = await generateText({
      model: geminiModel(),
      output: Output.object({ schema: extractionSchema }),
      prompt: buildJobPostingExtractionPrompt(pageText),
    });
    const output = result.output;

    // 候補リスト外の値が返ってもフォームに入れないよう、マスタと再照合する。
    const industry = parseTaxonomyPair(INDUSTRY_TAXONOMY, output.industry);
    const job = parseTaxonomyPair(ROLE_TAXONOMY, output.job);

    const context: JobPostingContext = {
      pageKind: output.pageKind,
      usableAsContext: output.usableAsContext,
      companyName: emptyToNull(output.companyName),
      industry,
      job,
      employmentKind: output.employmentKind,
      businessSummary: emptyToNull(output.businessSummary),
      jobSummary: emptyToNull(output.jobSummary),
      keyPoints: output.keyPoints
        .map((point) => point.trim())
        .filter((point) => point.length > 0)
        .slice(0, MAX_KEY_POINTS),
    };
    // 種別と矛盾する組み合わせ（エラーページなのに使える等）はここで正す。
    return { ...context, usableAsContext: isUsableAsQuestionContext(context) };
  }
}
