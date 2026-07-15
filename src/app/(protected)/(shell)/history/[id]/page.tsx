import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionDetailView } from "@/components/interview/SessionDetailView";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "44px 32px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="セッションの振り返り" subtitle="過去の練習の記録" back={{ href: "/history", label: "一覧へ戻る" }} />

      <SessionDetailView sessionId={id} />

      <section className="ib-section" style={{ display: "flex", gap: 12, paddingTop: 2 }}>
        <Link href="/history" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>履歴一覧に戻る</Link>
        <Link href="/interview/setup" className="btn btn-primary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>同じ設定でもう一度挑戦する</Link>
      </section>
    </main>
  );
}
