import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import { resolveInterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type { JobPostingContext } from "@/domain/interview/model/JobPosting.vo";
import { isUsableAsQuestionContext } from "@/domain/interview/model/JobPosting.vo";
import { MAIN_QUESTION_AXIS_PLAN } from "@/domain/interview/model/mainQuestionPlan";
import type { Question } from "@/domain/interview/model/Question.entity";
import type { SelectedQuestion } from "@/domain/interview/model/SelectedQuestion.vo";
import { MainQuestionSource } from "@/domain/interview/model/SelectedQuestion.vo";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IMainQuestionGenerationService } from "@/domain/interview/ports/IMainQuestionGenerationService";
import type { IOpeningSpeechService } from "@/domain/interview/ports/IOpeningSpeechService";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import { selectMainQuestions } from "@/domain/interview/services/selectMainQuestions";
import { jstDateString } from "@/lib/jstDate";

export type StartInterviewInput = {
  userId: string;
  companyName?: string;
  industryMajor?: string;
  industryMinor?: string;
  jobMajor?: string;
  jobMinor?: string;
  selectionStage?: string;
  interviewerType?: InterviewerType;
  voiceEnabled?: boolean;
  /**
   * 求人ページから抽出した文脈。本質問を求人由来で生成する場合に必要。
   * 解析していない／解析に失敗した場合は undefined。
   */
  jobPosting?: JobPostingContext;
  /** 本質問を求人由来の生成に切り替えるか（既定はバンク抽選）。 */
  generateQuestionsFromJobPosting?: boolean;
};

export type StartInterviewResult = {
  session: InterviewSession;
  firstQuestion: Question;
  speechText: string;
  /**
   * 実際に音声が有効化されたか。要求(voiceEnabled=true)でも本日の音声枠を使用済みなら
   * false にフォールバックする。クライアントはこの値で読み上げ可否・通知を判断する。
   */
  voiceEnabled: boolean;
  /** 本質問が求人由来の生成に切り替わったか（生成に失敗した場合は false）。 */
  questionsGeneratedFromJobPosting: boolean;
};

export class StartInterviewUseCase {
  constructor(
    private readonly questionBankProvider: IQuestionBankProvider,
    private readonly interviewSessionRepository: IInterviewSessionRepository,
    private readonly openingSpeechService?: IOpeningSpeechService,
    private readonly mainQuestionGenerationService?: IMainQuestionGenerationService,
  ) {}

  async execute(input: StartInterviewInput): Promise<StartInterviewResult> {
    const interviewerType = resolveInterviewerType(input.interviewerType);
    const selectedQuestions = await this.resolveMainQuestions(input);
    const questionsGeneratedFromJobPosting = selectedQuestions.some(
      (question) => question.source === MainQuestionSource.GENERATED,
    );

    // 音声ありは 1 日 1 セッションまで。枠を消費できなければ音声 OFF にフォールバックし、
    // 面接自体は開始させる（後段の TTS ゲートも voiceEnabled=true のセッションのみ許可）。
    const voiceEnabled = await this.resolveVoiceEnabled(input.userId, input.voiceEnabled);

    const { session, firstQuestion } =
      await this.interviewSessionRepository.createSession({
        userId: input.userId,
        companyName: input.companyName,
        industryMajor: input.industryMajor,
        industryMinor: input.industryMinor,
        jobMajor: input.jobMajor,
        jobMinor: input.jobMinor,
        selectionStage: input.selectionStage,
        interviewerType,
        voiceEnabled,
        selectedQuestions,
      });

    let speechText = firstQuestion.content;
    if (voiceEnabled && this.openingSpeechService) {
      try {
        const generated = await this.openingSpeechService.generate({
          displayText: firstQuestion.content,
          companyName: input.companyName,
          selectionStage: input.selectionStage,
          interviewerType,
        });
        if (generated.trim().length > 0) {
          speechText = generated;
        }
      } catch {
        speechText = firstQuestion.content;
      }
    }

    return {
      session,
      firstQuestion,
      speechText,
      voiceEnabled,
      questionsGeneratedFromJobPosting,
    };
  }

  /**
   * 本質問 5 問を決める。求人由来の生成を要求された場合のみ生成を試み、
   * 失敗したらバンク抽選へ落とす。
   *
   * 生成は外部 API 依存で失敗しうる一方、面接そのものはバンク抽選で問題なく
   * 成立する。ここで例外を伝播させて面接開始ごと失敗させる価値はないため、
   * 開始発話（{@link IOpeningSpeechService}）と同じくフォールバックする。
   */
  private async resolveMainQuestions(
    input: StartInterviewInput,
  ): Promise<SelectedQuestion[]> {
    // 解析結果はクライアント経由で戻ってくるため、抽出時の整合チェックを
    // ここでもう一度通す（usableAsContext だけを信用しない）。
    const jobPosting =
      input.generateQuestionsFromJobPosting === true &&
      input.jobPosting !== undefined &&
      isUsableAsQuestionContext(input.jobPosting)
        ? input.jobPosting
        : undefined;
    const generationService = this.mainQuestionGenerationService;

    if (jobPosting !== undefined && generationService !== undefined) {
      try {
        return await generationService.generate({
          jobPosting,
          plan: MAIN_QUESTION_AXIS_PLAN,
        });
      } catch (error) {
        console.error("Main question generation failed; falling back to bank:", error);
      }
    }
    return selectMainQuestions(this.questionBankProvider.load());
  }

  /**
   * 音声要求なら本日の枠をアトミックに消費する。消費できれば true、使用済みなら
   * false にフォールバックする。消費（＝VoiceUsage 記録）はセッション作成より前に
   * 行うため、同時リクエストでも DB の一意制約で 1 件に絞られる。
   */
  private async resolveVoiceEnabled(
    userId: string,
    requested: boolean | undefined,
  ): Promise<boolean> {
    if (!requested) {
      return false;
    }
    return this.interviewSessionRepository.tryConsumeVoiceQuota(
      userId,
      jstDateString(new Date()),
    );
  }
}
