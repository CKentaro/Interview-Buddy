import type { UserProfile } from "@/domain/user/model/UserProfile";
import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { UserNotFoundError } from "./errors";

/**
 * GET /api/users/[id] のユースケース。
 *
 * プロフィール＋利用サマリを返す。認可は「本人のみ」で、リクエスト元と対象 id が
 * 一致しない場合は情報秘匿のため存在有無を漏らさず {@link UserNotFoundError} を投げる。
 */
export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(requesterId: string, targetUserId: string): Promise<UserProfile> {
    // 本人チェック（認可）。非本人は非存在と区別せず 404 相当にする。
    if (requesterId !== targetUserId) {
      throw new UserNotFoundError(targetUserId);
    }

    const profile = await this.userRepository.getProfileWithStats(targetUserId);
    if (profile === null) {
      throw new UserNotFoundError(targetUserId);
    }
    return profile;
  }
}
