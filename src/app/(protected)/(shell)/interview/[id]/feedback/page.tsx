import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionDetailView } from "@/components/interview/SessionDetailView";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="ib-page" style={{ "--ib-page-max": "920px" } as React.CSSProperties}>
      <PageHeader title="練習の振り返り" subtitle="面接練習のフィードバック" />

      <SessionDetailView sessionId={id} />

      <section className="ib-section ib-actions" style={{ paddingTop: 2 }}>
        <Link href="/home" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>ホームに戻る</Link>
        <Link href="/interview/setup" className="btn btn-primary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>もう一度練習する</Link>
      </section>
    </main>
  );
}
