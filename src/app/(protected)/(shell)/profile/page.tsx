import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const useCase = new GetUserUseCase(new PrismaUserRepository());
  const profile = await useCase.execute(userId, userId);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight">プロフィール</h1>

      <div className="flex items-center gap-4 rounded-xl border border-black/10 p-6">
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.image}
            alt=""
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-xl font-bold">
            {(profile.name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold">
            {profile.name ?? "名前未設定"}
          </div>
          <div className="text-sm text-black/50">{profile.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-black/10 p-6">
          <div className="text-xs text-black/40">面接練習の総回数</div>
          <div className="mt-2 text-2xl font-bold">
            {profile.totalSessions}
            <span className="ml-1 text-sm font-normal text-black/40">回</span>
          </div>
        </div>
        <div className="rounded-xl border border-black/10 p-6">
          <div className="text-xs text-black/40">最終練習日</div>
          <div className="mt-2 text-2xl font-bold">
            {profile.lastSessionAt
              ? formatDate(profile.lastSessionAt)
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
