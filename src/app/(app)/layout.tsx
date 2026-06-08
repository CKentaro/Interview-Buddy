import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar user={session.user} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
