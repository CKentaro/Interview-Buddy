import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * 要ログイン領域の共通レイアウト（認証ガード専用）。
 * シェルの有無は配下の (shell) / (immersive) グループで分ける。
 * このレイアウト1箇所で (shell)・(immersive) 配下の全ページ（live 含む）を一括保護する。
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session) redirect("/login");

  return <>{children}</>;
}
