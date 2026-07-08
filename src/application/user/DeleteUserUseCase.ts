import type { IUserRepository } from "@/domain/user/ports/IUserRepository";
import { UserNotFoundError } from "./errors";

/**
 * DELETE /api/users/[id]（退会）のユースケース。
 *
 * 認可は「本人のみ」。リクエスト元と対象 id が一致しない場合は情報秘匿のため
 * {@link UserNotFoundError} を投げる。関連データの削除は DB のカスケードに委ねる。
 */
export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(requesterId: string, targetUserId: string): Promise<void> {
    // 本人チェック（認可）。非本人は非存在と区別せず 404 相当にする。
    if (requesterId !== targetUserId) {
      throw new UserNotFoundError(targetUserId);
    }

    await this.userRepository.delete(targetUserId);
  }
}
