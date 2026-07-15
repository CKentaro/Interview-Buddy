import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import { resolveInterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type { Question } from "@/domain/interview/model/Question.entity";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
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
};

export class StartInterviewUseCase {
  constructor(
    private readonly questionBankProvider: IQuestionBankProvider,
    private readonly interviewSessionRepository: IInterviewSessionRepository,
    private readonly openingSpeechService?: IOpeningSpeechService,
  ) {}

  async execute(input: StartInterviewInput): Promise<StartInterviewResult> {
    const interviewerType = resolveInterviewerType(input.interviewerType);
    const bank = this.questionBankProvider.load();
    const selectedQuestions = selectMainQuestions(bank);

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

    return { session, firstQuestion, speechText, voiceEnabled };
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
