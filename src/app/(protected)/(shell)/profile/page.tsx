import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GetUserUseCase } from "@/application/user/GetUserUseCase";
import { PrismaUserRepository } from "@/infrastructure/prisma/PrismaUserRepository";
import { PageHeader } from "@/components/layout/PageHeader";
import { GoogleGIcon } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

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
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 28, lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 400, fontFamily: "var(--font-jp)" }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: muted(55), marginTop: 4, fontFamily: "var(--font-jp)" }}>{label}</div>
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
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "44px 32px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="プロフィール" subtitle="アカウントと練習の情報" />

      {/* user */}
      <section className="card elev-md" style={{ padding: 24, flexDirection: "row", alignItems: "center", gap: 16 }}>
        {profile.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.image} alt={profile.name ?? "ユーザー"} referrerPolicy="no-referrer" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", flex: "none", background: "var(--color-neutral-300)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, fontFamily: "var(--font-jp)" }}>{avatarChar}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 600, fontFamily: "var(--font-jp)" }}>{profile.name ?? "名前未設定"}</div>
          <div style={{ fontSize: 13, color: muted(60), marginTop: 2 }}>{profile.email}</div>
        </div>
      </section>

      {/* stats */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-jp)" }}>これまでの積み重ね</h3>
        <div className="card elev-sm" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, padding: 16 }}>
          <Stat value={String(profile.totalSessions)} unit="回" label="練習回数" />
          <Stat value={relLabel(profile.lastSessionAt)} label="最終練習日" />
        </div>
      </section>

      {/* account */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-jp)" }}>アカウント</h3>
        <div className="card elev-sm" style={{ padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <GoogleGIcon size={20} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--font-jp)" }}>Google アカウント連携</div>
              <div style={{ fontSize: 12, color: muted(55), fontFamily: "var(--font-jp)" }}>{profile.email} と連携済みです</div>
            </div>
          </div>
          <span className="tag tag-accent">連携済み</span>
        </div>
      </section>
    </main>
  );
}
