import type {
  IInterviewSessionLifecycleRepository,
  ResumableSessionSummary,
} from "@/domain/interview/ports/IInterviewSessionLifecycleRepository";

/** HOME 用に、本人の中断中面接を取得するユースケース。 */
export class GetResumableInterviewsUseCase {
  constructor(
    private readonly lifecycleRepository: IInterviewSessionLifecycleRepository,
  ) {}

  execute(userId: string): Promise<ResumableSessionSummary[]> {
    return this.lifecycleRepository.findPausedByUser(userId);
  }
}
