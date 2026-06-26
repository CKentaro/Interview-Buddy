import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PagePlaceholder title={`面接履歴 詳細: ${id}`} />;
}
