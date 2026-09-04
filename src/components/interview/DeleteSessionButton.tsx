"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Props = {
  sessionId: string;
};

/**
 * 練習記録を削除するボタン（履歴の詳細画面用）。
 *
 * 一覧ではなく詳細に置く。取り消せない操作なので、中身（質問・回答・フィードバック）を
 * 見たうえで消すかどうかを決められる位置が適している。
 * 削除後は一覧へ戻す。詳細を表示したままにすると、消えた記録を指す URL に残ってしまう。
 */
export function DeleteSessionButton({ sessionId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`${response.status}`);
      // 一覧はサーバー側で取得し直す（削除した記録が残って見えないように）。
      router.replace("/history");
      router.refresh();
    } catch (e) {
      console.error("練習記録の削除に失敗しました", e);
      setError("削除できませんでした。時間をおいて、もう一度お試しください。");
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => { setError(""); setConfirming(true); }}
        // 枠のある破壊的操作のボタン（ホームの中断セッション削除と同じ見た目）。
        style={{ color: "var(--color-danger)", borderColor: "var(--color-danger-line)" }}
      >
        この練習記録を削除する
      </button>

      {confirming && (
        <ConfirmDialog
          title="この練習記録を削除しますか？"
          confirmLabel="削除する"
          confirmingLabel="削除しています…"
          busy={deleting}
          error={error}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
        >
          この面接練習の記録を削除します。質問と回答、フィードバックも一緒に削除されます。
          この操作は取り消せません。
        </ConfirmDialog>
      )}
    </>
  );
}
