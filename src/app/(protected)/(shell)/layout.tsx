import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * シェル付き画面の共通レイアウト（サイドバー）。
 * 認証は親の (protected)/layout.tsx で済んでいるので、ここは見た目の枠だけを担う。
 * 面接実施中(live)はシェル不要なので (immersive) グループに分けてある。
 * モバイルでは Sidebar 自身が上部バー + ドロワーへ姿を変える（globals.css）。
 */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <div className="ib-shell">
      <Sidebar user={session?.user} />
      <div className="ib-shell-main">{children}</div>
    </div>
  );
}
