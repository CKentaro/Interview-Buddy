import type {
  IInterviewSessionRepository,
  SessionSummary,
} from "@/domain/interview/ports/IInterviewSessionRepository";

/**
 * GET /api/sessions のユースケース（履歴一覧）。
 *
 * ホーム／履歴画面用に、本人の完了済みセッション一覧（件数・Feedback 有無つき）を
 * 返す読み取り系。userId スコープはリポジトリが保証する。
 */
export class GetInterviewHistoryUseCase {
  constructor(
    private readonly interviewSessionRepository: IInterviewSessionRepository,
  ) {}

  execute(userId: string): Promise<SessionSummary[]> {
    return this.interviewSessionRepository.findCompletedByUser(userId);
  }
}
