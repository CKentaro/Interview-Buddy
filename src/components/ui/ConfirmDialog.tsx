"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  /** 何が起きるかの説明。取り消せない操作ではその旨も書く。 */
  children: ReactNode;
  /** 実行ボタンの文言と、実行中の文言。 */
  confirmLabel: string;
  confirmingLabel: string;
  /** 実行中は閉じさせない（二重実行と、結果を見ないままの離脱を防ぐ）。 */
  busy: boolean;
  /** 実行に失敗したときの理由。ダイアログを開いたまま伝える。 */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 取り消せない操作の確認ダイアログ。
 *
 * 削除のように後戻りできない操作は、押し間違いから守るだけでなく「何が一緒に
 * 消えるか」を実行前に見せる必要がある。本文を呼び出し側から渡せるようにして、
 * その説明を対象ごとに書き分けられるようにしている。
 *
 * aria-modal を名乗る以上、キーボード操作もモーダルとして成立させる:
 * 開いたらキャンセルへフォーカスを移し、Tab はダイアログ内で循環させ、
 * Escape で閉じ、閉じたら元の要素へフォーカスを戻す。
 *
 * NOTE: 中身は必ず body へポータルする。`.ib-section` は入場アニメーション
 * （ib-fade-up）を fill-mode: both で持つため、終了後も transform が残り、
 * その内側では position: fixed がビューポートではなくセクション基準になる
 * （＝画面の中央ではなくセクションの中央に出て、下にはみ出す）。
 * 呼び出し位置によって挙動が変わらないよう、ここで断ち切っておく。
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  confirmingLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  /** ダイアログ内のフォーカスできる要素（順序どおり）。 */
  const focusables = () =>
    Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );

  // 開いたら既定でキャンセルへフォーカスし（取り消せない操作を Enter 連打で
  // 実行させない）、閉じたら開いたボタンへ戻す。
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    focusables()[0]?.focus();
    return () => opener?.focus();
  }, []);

  // Escape で閉じ、Tab はダイアログ内で循環させる（背後の画面へ抜けさせない）。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!busy) onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  // サーバー描画時は何も出さない（開くのは常に操作後＝クライアント側のため）。
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="dialog-backdrop" onClick={() => !busy && onCancel()}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title" id={titleId}>{title}</div>
        <div className="dialog-body">{children}</div>
        {error && (
          <p
            role="alert"
            style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "var(--color-danger)" }}
          >
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            キャンセル
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
