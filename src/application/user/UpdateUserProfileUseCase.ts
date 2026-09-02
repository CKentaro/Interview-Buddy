import { toCareerPreference } from "@/domain/user/model/CareerPreference.vo";
import { normalizeDisplayName } from "@/domain/user/model/DisplayName.vo";
import type { UserProfile } from "@/domain/user/model/UserProfile";
import type {
  IUserRepository,
  UserProfileUpdate,
} from "@/domain/user/ports/IUserRepository";
import { UserNotFoundError } from "./errors";

/**
 * 更新入力（DTO と同じ平坦な形）。
 *
 * 志望設定の 4 項目は 1 組として扱い、部分更新しない。いずれかのキーが
 * 現れたら「志望設定を丸ごと差し替える」と解釈する（大小が片方だけ、または
 * マスタ外の組み合わせは未設定に倒れる）。オンボーディングもマイページも、
 * この 4 項目は常にまとめて送る画面になっている。
 */
export type UpdateUserProfileInput = {
  /** 表示名。null / 空文字は「未設定に戻す」。 */
  name?: string | null;
  industryMajor?: string | null;
  industryMinor?: string | null;
  jobMajor?: string | null;
  jobMinor?: string | null;
  /** オンボーディングを完了として記録するか（スキップでも true を送る）。 */
  completeOnboarding?: boolean;
};

const CAREER_KEYS = [
  "industryMajor",
  "industryMinor",
  "jobMajor",
  "jobMinor",
] as const;

/**
 * PATCH /api/users/[id] のユースケース。
 *
 * 表示名と志望設定を更新し、更新後のプロフィールを返す。認可は「本人のみ」で、
 * リクエスト元と対象 id が一致しない場合は情報秘匿のため {@link UserNotFoundError} を投げる。
 */
export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    requesterId: string,
    targetUserId: string,
    input: UpdateUserProfileInput,
  ): Promise<UserProfile> {
    // 本人チェック（認可）。非本人は非存在と区別せず 404 相当にする。
    if (requesterId !== targetUserId) {
      throw new UserNotFoundError(targetUserId);
    }

    const hasCareerInput = CAREER_KEYS.some((key) => key in input);
    const update: UserProfileUpdate = {
      ...(input.name !== undefined
        ? { name: normalizeDisplayName(input.name) }
        : {}),
      ...(hasCareerInput ? { careerPreference: toCareerPreference(input) } : {}),
      ...(input.completeOnboarding === true ? { completeOnboarding: true } : {}),
    };

    const updated = await this.userRepository.updateProfile(
      targetUserId,
      update,
    );
    if (!updated) {
      throw new UserNotFoundError(targetUserId);
    }

    const profile =
      await this.userRepository.getProfileWithStats(targetUserId);
    if (profile === null) {
      throw new UserNotFoundError(targetUserId);
    }
    return profile;
  }
}
