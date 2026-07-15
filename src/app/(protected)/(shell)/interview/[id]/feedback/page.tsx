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
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "44px 32px 56px", display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="練習の振り返り" subtitle="面接練習のフィードバック" />

      <SessionDetailView sessionId={id} />

      <section className="ib-section" style={{ display: "flex", gap: 12, paddingTop: 2 }}>
        <Link href="/home" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>ホームに戻る</Link>
        <Link href="/interview/setup" className="btn btn-primary" style={{ flex: 1, justifyContent: "center", padding: 12 }}>もう一度練習する</Link>
      </section>
    </main>
  );
}
