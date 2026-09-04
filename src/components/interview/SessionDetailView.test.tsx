import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedbackResponse, SessionDetailResponse } from "@/app/api/types";
import { InterviewLength } from "@/domain/interview/model/InterviewLength.vo";
import { SessionDetailView } from "./SessionDetailView";
import { feedbackGuideStorageKey } from "./feedbackGuideStorage";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

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
  window.localStorage.clear();
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

  it("評価軸の疑問符を押すと、その軸の説明を開閉できる", async () => {
    window.localStorage.setItem(feedbackGuideStorageKey("user-1"), "seen");
    mockFetch(200, {
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "よく話せていました。",
      axisFeedbacks: [
        {
          axis: "SELF_AWARENESS",
          axisLabel: "自己認識",
          comment: "具体的なエピソードを交えて説明できています。",
        },
      ],
    });

    render(<SessionDetailView sessionId="session-1" />);

    const helpButton = await screen.findByRole("button", {
      name: "自己認識の評価軸について",
    });
    expect(helpButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("この軸で見ていること")).not.toBeInTheDocument();

    fireEvent.click(helpButton);

    expect(helpButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("この軸で見ていること")).toBeInTheDocument();
    expect(screen.getByText(/自分の強み・弱みや特性を/)).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(screen.queryByText("この軸で見ていること")).not.toBeInTheDocument();
  });

  it("初回は説明と評価軸の補足を展開し、確認時に既読を保存する", async () => {
    mockFetch(200, {
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "よく話せていました。",
      axisFeedbacks: [
        {
          axis: "SELF_AWARENESS",
          axisLabel: "自己認識",
          comment: "具体的なエピソードを交えて説明できています。",
        },
      ],
    });

    render(<SessionDetailView sessionId="session-1" />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("heading", {
      name: "フィードバックの見方",
    })).toBeInTheDocument();
    const axisHelpButton = screen.getByRole("button", {
      name: "自己認識の評価軸について",
    });
    expect(axisHelpButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/自分の強み・弱みや特性を/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "4つの視点を見てみる",
    }));

    expect(window.localStorage.getItem(feedbackGuideStorageKey("user-1"))).toBe("seen");
    expect(screen.queryByRole("heading", {
      name: "フィードバックの見方",
    })).not.toBeInTheDocument();
    expect(axisHelpButton).toHaveAttribute("aria-expanded", "true");
  });

  it("確認済みなら自動表示せず、画面上のボタンから説明を再表示できる", async () => {
    window.localStorage.setItem(feedbackGuideStorageKey("user-1"), "seen");
    mockFetch(200, {
      status: "completed",
      feedbackId: "fb-1",
      overallComment: "よく話せていました。",
      axisFeedbacks: [],
    });

    render(<SessionDetailView sessionId="session-1" />);

    const aboutButton = await screen.findByRole("button", {
      name: "フィードバックについて",
    });
    expect(screen.queryByRole("heading", {
      name: "フィードバックの見方",
    })).not.toBeInTheDocument();

    fireEvent.click(aboutButton);

    expect(screen.getByRole("heading", {
      name: "フィードバックの見方",
    })).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "説明を閉じる" });
    const returnButton = screen.getByRole("button", { name: "フィードバックに戻る" });
    expect(returnButton).toBeInTheDocument();

    returnButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(returnButton).toHaveFocus();

    fireEvent.click(returnButton);
    await waitFor(() => expect(aboutButton).toHaveFocus());
  });
});
