import Link from "next/link";
import { SessionDetailView } from "@/components/interview/SessionDetailView";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-wider text-black/40">
          面接お疲れさまでした
        </div>
        <Link href="/home" className="text-sm text-black/60 underline">
          ホームへ戻る
        </Link>
      </div>
      <SessionDetailView sessionId={id} />
    </div>
  );
}
