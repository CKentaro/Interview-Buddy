import { beforeEach, describe, expect, it, vi } from "vitest";

// auth-guard を丸ごとモックする（実物は @/auth → next-auth を読み込みテスト環境で解決できないため）。
// UnauthorizedError はモック内で定義し、route の instanceof 判定と同一クラスにする。
// PrismaUserRepository もスタブ化（route が new する実装を差し替える）。UseCase 本体は実物を通す。
// vi.hoisted でモック関数を巻き上げ、vi.mock ファクトリからの参照初期化順を保証する。
const { requireUser, UnauthorizedError, getProfileWithStats, deleteUser } =
  vi.hoisted(() => {
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
      deleteUser: vi.fn(),
    };
  });

vi.mock("@/lib/auth-guard", () => ({ requireUser, UnauthorizedError }));

vi.mock("@/infrastructure/prisma/PrismaUserRepository", () => ({
  // new で呼べるよう arrow ではなく function にする（返したオブジェクトがインスタンスになる）。
  PrismaUserRepository: vi.fn(function PrismaUserRepository() {
    return { getProfileWithStats, delete: deleteUser };
  }),
}));

import { DELETE, GET } from "./route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
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
    getProfileWithStats.mockResolvedValue({
      id: "user-1",
      name: "太郎",
      email: "taro@example.com",
      image: null,
      totalSessions: 2,
      lastSessionAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const res = await GET(new Request("http://x"), ctx("user-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "user-1",
      name: "太郎",
      email: "taro@example.com",
      image: null,
      totalSessions: 2,
      lastSessionAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("本人・セッション無し → lastSessionAt は null", async () => {
    requireUser.mockResolvedValue("user-1");
    getProfileWithStats.mockResolvedValue({
      id: "user-1",
      name: null,
      email: "taro@example.com",
      image: null,
      totalSessions: 0,
      lastSessionAt: null,
    });

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
