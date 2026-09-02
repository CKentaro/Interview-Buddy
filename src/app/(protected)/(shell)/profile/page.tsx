import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";


function relLabel(date: Date | null): string {
  if (!date) return "なし";
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 28, lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 400 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const profile = await new GetUserUseCase(new PrismaUserRepository()).execute(userId, userId);
  const avatarChar = (profile.name ?? "?").charAt(0).toUpperCase();

  return (
    <main className="ib-page" style={{ "--ib-page-max": "960px" } as React.CSSProperties}>
      <PageHeader title="プロフィール" subtitle="アカウントと練習の情報" />

      {/* user */}
      <section className="card" style={{ padding: 24, flexDirection: "row", alignItems: "center", gap: 16 }}>
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.image} alt={profile.name ?? "ユーザー"} referrerPolicy="no-referrer" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", flex: "none", background: "var(--color-neutral-300)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>{avatarChar}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 500 }}>{profile.name ?? "名前未設定"}</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{profile.email}</div>
        </div>
      </section>

      {/* stats */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>これまでの積み重ね</h3>
        <div className="card ib-stat-grid">
          <Stat value={String(profile.totalSessions)} unit="回" label="練習回数" />
          <Stat value={relLabel(profile.lastSessionAt)} label="最終練習日" />
        </div>
      </section>

      {/* account */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>アカウント</h3>
        <div className="card ib-split" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/google-g.svg" alt="" width={20} height={20} style={{ flex: "none" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Google アカウント連携</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{profile.email} と連携済みです</div>
            </div>
          </div>
          <span className="tag tag-accent">連携済み</span>
        </div>
      </section>

      <DeleteAccountSection userId={userId} />
    </main>
  );
}
