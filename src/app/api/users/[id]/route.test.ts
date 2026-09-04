import { beforeEach, describe, expect, it, vi } from "vitest";

// auth-guard を丸ごとモックする（実物は @/auth → next-auth を読み込みテスト環境で解決できないため）。
// UnauthorizedError はモック内で定義し、route の instanceof 判定と同一クラスにする。
// PrismaUserRepository もスタブ化（route が new する実装を差し替える）。UseCase 本体は実物を通す。
// vi.hoisted でモック関数を巻き上げ、vi.mock ファクトリからの参照初期化順を保証する。
const {
  requireUser,
  UnauthorizedError,
  getProfileWithStats,
  updateProfile,
  deleteUser,
} = vi.hoisted(() => {
  class UnauthorizedError extends Error {
    constructor() {
      super("Unauthorized");
      this.name = "UnauthorizedError";
    }
  }
  return {
    requireUser: vi.fn<() => Promise<string>>(),
    UnauthorizedError,
    getProfileWithStats: vi.fn(),
    updateProfile: vi.fn(),
    deleteUser: vi.fn(),
  };
});

vi.mock("@/lib/auth-guard", () => ({ requireUser, UnauthorizedError }));

vi.mock("@/infrastructure/prisma/PrismaUserRepository", () => ({
  // new で呼べるよう arrow ではなく function にする（返したオブジェクトがインスタンスになる）。
  PrismaUserRepository: vi.fn(function PrismaUserRepository() {
    return { getProfileWithStats, updateProfile, delete: deleteUser };
  }),
}));

import { DELETE, GET, PATCH } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** リポジトリが返すドメインのプロフィール（志望設定は組で持つ）。 */
function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "太郎",
    email: "taro@example.com",
    image: null,
    careerPreference: {
      industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
      job: null,
    },
    onboardingCompleted: true,
    totalSessions: 2,
    lastSessionAt: null,
    ...overrides,
  };
}

function patchRequest(body: unknown) {
  return new Request("http://x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/users/[id]", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await GET(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(401);
  });

  it("本人 → 200・DTO 整形（lastSessionAt は ISO 文字列）", async () => {
    requireUser.mockResolvedValue("user-1");
    getProfileWithStats.mockResolvedValue(
      profile({ lastSessionAt: new Date("2026-07-01T00:00:00.000Z") }),
    );

    const res = await GET(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "user-1",
      name: "太郎",
      email: "taro@example.com",
      image: null,
      industryMajor: "IT・インターネット",
      industryMinor: "ソフトウェア・SaaS",
      jobMajor: null,
      jobMinor: null,
      onboardingCompleted: true,
      totalSessions: 2,
      lastSessionAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("本人・セッション無し → lastSessionAt は null", async () => {
    requireUser.mockResolvedValue("user-1");
    getProfileWithStats.mockResolvedValue(
      profile({ name: null, totalSessions: 0 }),
    );

    const res = await GET(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).lastSessionAt).toBeNull();
  });

  it("非本人 → 404（リポジトリを呼ばない）", async () => {
    requireUser.mockResolvedValue("user-1");
    const res = await GET(new Request("http://x"), ctx("user-2"));
    expect(res.status).toBe(404);
    expect(getProfileWithStats).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/users/[id]", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await PATCH(patchRequest({ name: "花子" }), ctx("user-1"));
    expect(res.status).toBe(401);
  });

  it("非本人 → 404（更新しない）", async () => {
    requireUser.mockResolvedValue("user-1");
    const res = await PATCH(patchRequest({ name: "花子" }), ctx("user-2"));
    expect(res.status).toBe(404);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("未知のキー → 400（更新しない）", async () => {
    requireUser.mockResolvedValue("user-1");
    const res = await PATCH(patchRequest({ role: "admin" }), ctx("user-1"));
    expect(res.status).toBe(400);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("本人 → 200・志望設定は検証済みの組に変換して渡す", async () => {
    requireUser.mockResolvedValue("user-1");
    updateProfile.mockResolvedValue(true);
    getProfileWithStats.mockResolvedValue(profile({ name: "花子" }));

    const res = await PATCH(
      patchRequest({
        name: "  花子  ",
        industryMajor: "IT・インターネット",
        industryMinor: "ソフトウェア・SaaS",
        jobMajor: "",
        jobMinor: "",
        completeOnboarding: true,
      }),
      ctx("user-1"),
    );

    expect(res.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledWith("user-1", {
      name: "花子",
      careerPreference: {
        industry: { major: "IT・インターネット", minor: "ソフトウェア・SaaS" },
        job: null,
      },
      completeOnboarding: true,
    });
    expect((await res.json()).name).toBe("花子");
  });

  it("マスタに無い組み合わせ → 未設定に倒す", async () => {
    requireUser.mockResolvedValue("user-1");
    updateProfile.mockResolvedValue(true);
    getProfileWithStats.mockResolvedValue(profile());

    const res = await PATCH(
      patchRequest({ industryMajor: "金融・保険", industryMinor: "ゲーム" }),
      ctx("user-1"),
    );

    expect(res.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledWith("user-1", {
      careerPreference: { industry: null, job: null },
    });
  });

  it("更新対象が存在しない → 404", async () => {
    requireUser.mockResolvedValue("user-1");
    updateProfile.mockResolvedValue(false);
    const res = await PATCH(patchRequest({ name: "花子" }), ctx("user-1"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/users/[id]", () => {
  it("未認証 → 401", async () => {
    requireUser.mockRejectedValue(new UnauthorizedError());
    const res = await DELETE(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(401);
  });

  it("本人 → 204（delete を対象 id で呼ぶ）", async () => {
    requireUser.mockResolvedValue("user-1");
    deleteUser.mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("非本人 → 404（delete を呼ばない）", async () => {
    requireUser.mockResolvedValue("user-1");
    const res = await DELETE(new Request("http://x"), ctx("user-2"));
    expect(res.status).toBe(404);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
