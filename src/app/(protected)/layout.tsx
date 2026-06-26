import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * 要ログイン領域の共通レイアウト（認証ガード専用）。
 * シェルの有無は配下の (shell) / (immersive) グループで分ける。
 *
 * ここで auth() を呼び、未ログインなら /login へ redirect する。
 * このレイアウト1箇所で (shell)・(immersive) 配下の全ページ（live 含む）を
 * 一括保護できる。DB セッション戦略のため Node ランタイムで実行される。
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session) redirect("/login");

  return <>{children}</>;
}
