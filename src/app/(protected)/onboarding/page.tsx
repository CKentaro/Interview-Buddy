import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";

/**
 * 初回ログイン直後のプロフィール確認画面。
 *
 * (shell) の外に置いてあるので、サイドバーは出ず、(shell)/layout.tsx の
 * 誘導とも循環しない。確認済みのユーザーが URL 直打ちで来た場合はホームへ戻す。
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await new GetUserUseCase(new PrismaUserRepository()).execute(
    session.user.id,
    session.user.id,
  );
  if (profile.onboardingCompleted) redirect("/home");

  return (
    <OnboardingForm
      userId={profile.id}
      defaultName={profile.name ?? ""}
      email={profile.email}
    />
  );
}
