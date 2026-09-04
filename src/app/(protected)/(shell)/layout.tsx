import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GetOnboardingStatusUseCase } from "@/application/user/GetOnboardingStatusUseCase";
import { Sidebar } from "@/components/layout/Sidebar";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";

/**
 * シェル付き画面の共通レイアウト（サイドバー）。
 * 認証は親の (protected)/layout.tsx で済んでいるので、ここは見た目の枠と
 * 初回オンボーディングへの誘導を担う。
 * 面接実施中(live)はシェル不要なので (immersive) グループに分けてある。
 * モバイルでは Sidebar 自身が上部バー + ドロワーへ姿を変える（globals.css）。
 *
 * オンボーディング画面は (shell) の外に置いてあるため、この redirect は循環しない。
 * (immersive) を対象外にしているのは、面接中に割り込まないため（未確認のまま
 * 面接を始められるのは、この (shell) 配下の設定画面を通った場合だけ）。
 */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (session?.user?.id) {
    const onboarded = await new GetOnboardingStatusUseCase(
      new PrismaUserRepository(),
    ).execute(session.user.id);
    if (!onboarded) redirect("/onboarding");
  }

  return (
    <div className="ib-shell">
      <Sidebar user={session?.user} />
      <div className="ib-shell-main">{children}</div>
    </div>
  );
}
