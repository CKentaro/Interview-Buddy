import Link from "next/link";
import { SessionDetailView } from "@/components/interview/SessionDetailView";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-8">
      <Link href="/history" className="text-sm text-black/60 underline">
        ← 履歴一覧へ戻る
      </Link>
      <SessionDetailView sessionId={id} />
    </div>
  );
}
