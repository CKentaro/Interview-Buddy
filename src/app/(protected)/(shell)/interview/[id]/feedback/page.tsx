import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PagePlaceholder title={`フィードバック: ${id}`} />;
}
