/**
 * 中身が未実装の間、画面名だけを表示する仮コンポーネント。
 * ルート(/)と同じレイアウト。中身を実装する際はこの呼び出しを置き換える。
 */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{title}</h1>
    </main>
  );
}
