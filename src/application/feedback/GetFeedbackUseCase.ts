import type { Feedback } from "@/domain/feedback/model/Feedback.entity";
import type { IFeedbackRepository } from "@/domain/feedback/ports/IFeedbackRepository";
import type { IFeedbackSessionReader } from "@/domain/feedback/ports/IFeedbackSessionReader";
import {
  determineFeedbackStatus,
  type FeedbackStatus,
} from "@/domain/feedback/services/determineFeedbackStatus";
import { SessionNotFoundError } from "./errors";

/**
 * GetFeedbackUseCase の結果（判別可能ユニオン）。
 * completed のときだけ Feedback 本体（総評・軸別）を持つ。
 */
export type GetFeedbackResult =
  | { status: Exclude<FeedbackStatus, "completed"> }
  | { status: "completed"; feedback: Feedback };

/**
 * GET /api/sessions/[id]/feedback のユースケース。
 *
 * 所有チェック（本人のセッションのみ）と Feedback の有無を取得し、
 * {@link determineFeedbackStatus} で status を決定する。completed のときのみ詳細を返す。
 */
export class GetFeedbackUseCase {
  constructor(
    private readonly sessionReader: IFeedbackSessionReader,
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async execute(
    userId: string,
    sessionId: string,
    now: Date = new Date(),
  ): Promise<GetFeedbackResult> {
    // 所有チェックと Feedback 有無を並列取得。
    const [sessionState, feedback] = await Promise.all([
      this.sessionReader.findOwnedSessionState(userId, sessionId),
      this.feedbackRepository.findBySessionId(sessionId),
    ]);

    // 非存在／非所有は 404 秘匿。
    if (sessionState === null) {
      throw new SessionNotFoundError(sessionId);
    }

    // Feedback が保存されていれば完了（= determineFeedbackStatus の completed と同値）。
    // feedback で分岐することで型も非 null に絞られる。
    if (feedback !== null) {
      return { status: "completed", feedback };
    }

    // 未保存: 面接の終了状態から生成中/失敗を判定する（hasFeedback=false のため completed は返らない）。
    const status = determineFeedbackStatus(false, sessionState.endedAt, now);
    return { status: status === "failed" ? "failed" : "generating" };
  }
}
