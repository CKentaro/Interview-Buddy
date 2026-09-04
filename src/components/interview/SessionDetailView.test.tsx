import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackResponse, SessionDetailResponse } from "@/app/api/types";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import { SessionDetailView } from "./SessionDetailView";

const GENERATING_LABEL = "気づきをことばにまとめています…";
const RETRY_LABEL = "もう一度生成する";

/** 履歴詳細で開くような、終了済みで feedback だけ無いセッション。 */
function detailWith(feedback: FeedbackResponse): SessionDetailResponse {
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
    companyId: null,
    interviewLength: InterviewLength.STANDARD,
    voiceEnabled: false,
    questions: [],
    feedback,
  };
}

/**
 * POST /feedback/generate の status と GET /sessions/[id] の feedback を差し替える fetch。
 * 呼ばれた POST の回数を数え、連打で生成が多重起動しないことを検証する。
 */
function mockFetch(generateStatus: number, feedback: FeedbackResponse) {
  const generateCalls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        generateCalls.push(input);
        return new Response(null, { status: generateStatus });
      }
      return Response.json(detailWith(feedback));
    }),
  );
  return generateCalls;
}

afterEach(() => {
  // vitest の globals を切っているため RTL の自動 cleanup が入らない。明示的に解体する。
  cleanup();
  vi.unstubAllGlobals();
});

describe("SessionDetailView", () => {
  it("生成を起動した直後はサーバーが failed を返しても生成中を出し続ける", async () => {
    // サーバーは endedAt 起点でタイムアウト判定するため、履歴詳細（endedAt が古い）では
    // 生成を起動した直後の GET でも failed が返る。
    mockFetch(202, { status: "failed" });

    render(<SessionDetailView sessionId="session-1" />);

    expect(await screen.findByText(GENERATING_LABEL)).toBeInTheDocument();
    // 再生成ボタンが出ないので連打しようがない。
    expect(screen.queryByText(RETRY_LABEL)).not.toBeInTheDocument();
  });

  it("生成が起動されなかった failed では再生成ボタンを出す", async () => {
    // 200 = 既に feedback がある（＝生成は起動していない）。ここで待つ理由は無い。
    mockFetch(200, { status: "failed" });

    render(<SessionDetailView sessionId="session-1" />);

    expect(await screen.findByText(RETRY_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(GENERATING_LABEL)).not.toBeInTheDocument();
  });

  it("completed なら生成を待たずに総評を出す", async () => {
    mockFetch(200, {
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "よく話せていました。",
      axisFeedbacks: [],
    });

    render(<SessionDetailView sessionId="session-1" />);

    expect(await screen.findByText("よく話せていました。")).toBeInTheDocument();
    expect(screen.queryByText(GENERATING_LABEL)).not.toBeInTheDocument();
  });
});
