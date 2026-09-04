import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanyCombobox } from "./CompanyCombobox";

/** 候補を 1 件返す fetch。呼ばれた回数を数えて、無駄な検索が起きないことも見る。 */
function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      companies: [
        {
          id: "company-1",
          name: "トヨタ自動車株式会社",
          securitiesCode: "7203",
          isListed: true,
          industryLabel: "輸送用機器",
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CompanyCombobox", () => {
  it("求人の読み込みなどで企業名が入った状態で表示されても、候補を勝手に開かない", async () => {
    const fetchMock = stubFetch();

    render(
      <CompanyCombobox
        label="志望企業名"
        value="トヨタ自動車株式会社"
        companyId="company-1"
        onChange={() => {}}
      />,
    );

    // デバウンス（250ms）を十分に越えても、検索も候補の表示も起きない。
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ユーザーが打鍵したときは候補を出す", async () => {
    stubFetch();
    const onChange = vi.fn();

    const { rerender } = render(
      <CompanyCombobox label="志望企業名" value="" companyId={null} onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "トヨ" } });
    // 値は親が持つので、打鍵後の値で描画し直す。
    rerender(
      <CompanyCombobox label="志望企業名" value="トヨ" companyId={null} onChange={onChange} />,
    );

    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.getByText("トヨタ自動車株式会社")).toBeInTheDocument();
  });
});
