import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { SessionListItemResponse } from "@/app/api/types";
import { SessionCard } from "./SessionCard";

const LINK_LABEL = "企業データと紐づけ済み";

function session(companyId: string | null): SessionListItemResponse {
  return {
    id: "session-1",
    startedAt: "2026-07-01T00:00:00.000Z",
    endedAt: "2026-07-01T00:30:00.000Z",
    companyName: "テスト社",
    industryMajor: null,
    industryMinor: null,
    jobMajor: null,
    jobMinor: null,
    selectionStage: "first",
    interviewerType: null,
    companyId,
    questionCount: 12,
    hasFeedback: true,
  };
}

afterEach(cleanup);

describe("SessionCard", () => {
  it("企業マスタと紐づいた練習には印を出す", () => {
    render(<SessionCard s={session("company-1")} />);

    expect(screen.getByLabelText(LINK_LABEL)).toBeInTheDocument();
  });

  it("自由入力の企業名だけの練習には印を出さない（未紐づけは異常ではない）", () => {
    render(<SessionCard s={session(null)} />);

    expect(screen.queryByLabelText(LINK_LABEL)).not.toBeInTheDocument();
  });

  it("ホームの直近一覧（compact）では情報を絞るため印を出さない", () => {
    render(<SessionCard s={session("company-1")} compact />);

    expect(screen.queryByLabelText(LINK_LABEL)).not.toBeInTheDocument();
  });
});

