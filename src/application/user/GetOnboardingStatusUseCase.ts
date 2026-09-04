import type { IUserRepository } from "@/domain/user/ports/IUserRepository";

/**
 * 「初回のプロフィール確認（オンボーディング）を終えているか」だけを問い合わせる
 * ユースケース。シェル付き画面のレイアウトが毎回呼ぶため、利用サマリを伴う
 * GetUserUseCase ではなく専用の軽い問い合わせにしてある。
 *
 * 本人の状態しか取れないので id の突き合わせは不要（呼び出し側が
 * requireUser() / auth() で得た自分の id を渡す）。
 */
export class GetOnboardingStatusUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<boolean> {
    const completed = await this.userRepository.isOnboardingCompleted(userId);
    // 退会直後などでユーザー行が無い場合は「完了」とみなす。
    // 誘導しても何も保存できず、オンボーディング画面から出られなくなるため。
    return completed ?? true;
  }
}
