import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionDetailView } from "@/components/interview/SessionDetailView";
import { DeleteSessionButton } from "@/components/interview/DeleteSessionButton";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="ib-page" style={{ "--ib-page-max": "920px" } as React.CSSProperties}>
      <PageHeader title="セッションの振り返り" subtitle="過去の練習の記録" back={{ href: "/history", label: "一覧へ戻る" }} />

      <SessionDetailView sessionId={id} />

      <section className="ib-section ib-actions" style={{ paddingTop: 2 }}>
        <Link href="/history" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>履歴一覧に戻る</Link>
        {/* from を渡すと、設定画面がこのセッションの設定を復元して確認ステップから始まる。 */}
        <Link href={`/interview/setup?from=${id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>同じ設定でもう一度挑戦する</Link>
      </section>

      {/* 取り消せない操作なので、主要な導線とは離して置く。 */}
      <section className="ib-section" style={{ display: "flex", justifyContent: "center", paddingTop: 0 }}>
        <DeleteSessionButton sessionId={id} />
      </section>
    </main>
  );
}
