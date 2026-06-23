import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * シェル付き画面の共通レイアウト（サイドバー）。
 * 認証は親の (app)/layout.tsx で済んでいるので、ここは見た目の枠だけを担う。
 * 面接実施中(live)はシェル不要なので (immersive) グループに分けてある。
 */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={session?.user} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
