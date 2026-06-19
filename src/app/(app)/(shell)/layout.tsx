/**
 * シェル付き画面の共通レイアウト（サイドバー/トップバー等）。
 * 認証は親の (app)/layout.tsx で済んでいるので、ここは見た目の枠だけを担う。
 *
 * TODO(UI実装時): ここにサイドバー/トップバーを置く。
 * 面接実施中(live)はシェル不要なので (immersive) グループに分けてある。
 */
export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
