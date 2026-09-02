import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DependentSelectField } from "./DependentSelectField";

const LOCKED_MESSAGE = "先に大分類を選んでください。";

function renderField(props: Partial<Parameters<typeof DependentSelectField>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <DependentSelectField
      label="小分類"
      value=""
      options={["銀行", "証券"]}
      enabled={true}
      placeholder="選択してください"
      lockedMessage={LOCKED_MESSAGE}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, select: screen.getByLabelText("小分類") };
}

afterEach(cleanup);

describe("DependentSelectField", () => {
  it("大分類が未選択でも枠は出す（後から現れる項目にしない）", () => {
    const { select } = renderField({ enabled: false, options: [] });
    expect(select).toBeInTheDocument();
    expect(select).toBeDisabled();
  });

  it("選べない状態で押されたときだけ理由を出す", () => {
    const { select } = renderField({ enabled: false, options: [] });
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();

    // disabled な要素自体は click を発火しないため、外側の枠で受ける。
    fireEvent.click(select.parentElement as HTMLElement);
    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
  });

  it("大分類が選ばれていれば理由は出さず、選択を親へ渡す", () => {
    const { onChange, select } = renderField();
    fireEvent.click(select.parentElement as HTMLElement);
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "証券" } });
    expect(onChange).toHaveBeenCalledWith("証券");
  });

  it("フォーム全体が操作不可のとき（保存中など）も選べない", () => {
    const { select } = renderField({ disabled: true });
    expect(select).toBeDisabled();
  });
});
