/**
 * 要ログイン領域の共通レイアウト（認証ガード専用）。
 * シェルの有無は配下の (shell) / (immersive) グループで分ける。
 *
 * TODO(認証実装時): ここで Auth.js の auth() を呼び、未ログインなら
 * /login へ redirect() する。このレイアウト1箇所で (shell)・(immersive)
 * 配下の全ページ（live 含む）を一括保護できる。
 *   const session = await auth();
 *   if (!session) redirect("/login");
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
