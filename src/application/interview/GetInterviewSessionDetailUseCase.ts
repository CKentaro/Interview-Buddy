import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import { determineFeedbackStatus } from "@/domain/feedback/services/determineFeedbackStatus";
import type {
  IInterviewSessionRepository,
  InterviewSessionDetail,
} from "@/domain/interview/ports/IInterviewSessionRepository";
import { SessionNotFoundError } from "./errors";

/**
 * GetInterviewSessionDetailUseCase の結果。
 * セッション詳細（Q&A）に、非同期生成される feedback を status 付きで合成する。
 */
export type SessionDetailResult = {
  detail: InterviewSessionDetail;
  feedback:
    | { status: "generating" | "failed" }
    | { status: "completed"; feedback: Feedback };
};

/**
 * GET /api/sessions/[id] のユースケース（interview／feedback を横断合成）。
 *
 * 所有チェック（本人のみ・非所有は 404 秘匿）の上で Q&A を取得し、同セッションの
 * Feedback を status 付きで埋め込む。履歴詳細・面接直後フィードバック画面の両方から
 * この 1 本が呼ばれる。status 判定は 3-4 と同じ {@link determineFeedbackStatus} を共有。
 */
export class GetInterviewSessionDetailUseCase {
  constructor(
    private readonly interviewSessionRepository: IInterviewSessionRepository,
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async execute(
    userId: string,
    sessionId: string,
    now: Date = new Date(),
  ): Promise<SessionDetailResult> {
    // 所有チェック兼 Q&A 取得と、Feedback 取得を並列で。
    const [detail, feedback] = await Promise.all([
      this.interviewSessionRepository.findDetailById(userId, sessionId),
      this.feedbackRepository.findBySessionId(sessionId),
    ]);

    // 非存在／非所有は 404 秘匿。
    if (detail === null) {
      throw new SessionNotFoundError(sessionId);
    }

    // Feedback があれば完了。無ければ終了状態から generating/failed を判定（3-4 と同一ロジック）。
    if (feedback !== null) {
      return { detail, feedback: { status: "completed", feedback } };
    }
    const status = determineFeedbackStatus(false, detail.endedAt, now);
    return { detail, feedback: { status: status === "failed" ? "failed" : "generating" } };
  }
}
