import { MAX_VOICE_SESSIONS_PER_DAY } from "@/domain/interview/model/voiceRateLimit";
import type { IInterviewSessionRepository } from "@/domain/interview/ports/IInterviewSessionRepository";
import { jstDateString } from "@/lib/jstDate";

/** 本日(JST)の音声ありセッションの利用状況。 */
export type VoiceSessionQuota = {
  /** 1 日あたりの上限回数。 */
  limit: number;
  /** 本日すでに使った回数。 */
  used: number;
  /** 本日の残り回数（0 以上）。 */
  remaining: number;
};

/**
 * 「本日あと何回、音声あり面接を開始できるか」を返すユースケース。
 * 面接設定画面（/setup）の残回数表示に使う。判定根拠は StartInterviewUseCase の
 * レート制限と同じ VoiceUsage ログ・同じ日境界(JST)。
 */
export class GetVoiceSessionQuotaUseCase {
  constructor(private readonly repository: IInterviewSessionRepository) {}

  async execute(userId: string): Promise<VoiceSessionQuota> {
    const used = await this.repository.countVoiceUsageOnDate(
      userId,
      jstDateString(new Date()),
    );
    const remaining = Math.max(0, MAX_VOICE_SESSIONS_PER_DAY - used);
    return { limit: MAX_VOICE_SESSIONS_PER_DAY, used, remaining };
  }
}
