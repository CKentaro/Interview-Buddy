import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

function renderDialog(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      title="削除しますか？"
      confirmLabel="削除する"
      confirmingLabel="削除しています…"
      busy={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    >
      本文
    </ConfirmDialog>,
  );
  return { onCancel, onConfirm };
}

describe("ConfirmDialog", () => {
  it("開いた直後はキャンセルにフォーカスする（Enter で誤って実行させない）", () => {
    renderDialog();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "キャンセル" }));
  });

  it("Escape で閉じられる", () => {
    const { onCancel } = renderDialog();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("実行中は Escape で閉じない（結果を見ないまま離脱させない）", () => {
    const { onCancel } = renderDialog({ busy: true });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it("失敗の理由はダイアログを開いたまま伝える", () => {
    renderDialog({ error: "削除できませんでした。" });

    expect(screen.getByRole("alert")).toHaveTextContent("削除できませんでした。");
  });
});
