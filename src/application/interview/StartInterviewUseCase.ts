import type { InterviewSession } from "@/domain/interview/model/InterviewSession.entity";
import type { InterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import { resolveInterviewerType } from "@/domain/interview/model/InterviewerType.vo";
import type { Question } from "@/domain/interview/model/Question.entity";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import type { IOpeningSpeechService } from "@/domain/interview/ports/IOpeningSpeechService";
import type { IQuestionBankProvider } from "@/domain/interview/ports/IQuestionBankProvider";
import { selectMainQuestions } from "@/domain/interview/services/selectMainQuestions";

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
        selectedQuestions,
      });

    let speechText = firstQuestion.content;
    if (input.voiceEnabled && this.openingSpeechService) {
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

    return { session, firstQuestion, speechText };
  }
}
