import { NavBar } from "@/components/layout/NavBar";

/**
 * シェル付き画面の共通レイアウト（サイドバー/トップバー等）。
 * 認証は親の (protected)/layout.tsx で済んでいるので、ここは見た目の枠だけを担う。
 *
 * 面接実施中(live)はシェル不要なので (immersive) グループに分けてある。
 */
export default function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </>
  );
}
