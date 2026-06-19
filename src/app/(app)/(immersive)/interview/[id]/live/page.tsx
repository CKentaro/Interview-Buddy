import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

/**
 * 面接実施中の画面。没入させたいためシェル無しの (immersive) グループに置く。
 * 認証は親の (app)/layout.tsx で他の要ログイン画面とまとめて保護される。
 */
export default async function InterviewLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PagePlaceholder title={`面接実施中: ${id}`} />;
}
