import { describe, expect, it, vi } from "vitest";

import { JobPostingFetchError } from "@/domain/interview/ports/IJobPostingFetcher";
import { assertSafeUrl } from "./urlGuard";

// 名前解決はテストではスタブし、ホスト名からアドレスを決める。
vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(async (hostname: string) => {
    if (hostname === "internal.example.com") return [{ address: "10.0.0.5" }];
    if (hostname === "unknown.example.com") throw new Error("ENOTFOUND");
    return [{ address: "93.184.216.34" }];
  });
  return { lookup, default: { lookup } };
});

describe("assertSafeUrl", () => {
  it("外部の https URL を許可する", async () => {
    await expect(assertSafeUrl("https://example.com/jobs/1")).resolves.toBeInstanceOf(URL);
  });

  it.each([
    ["file:///etc/passwd", "スキーム"],
    ["javascript:alert(1)", "スキーム"],
    ["not a url", "形式"],
    ["https://user:pass@example.com/", "認証情報"],
    ["http://example.com:8080/", "非標準ポート"],
    ["http://127.0.0.1/", "IPv4 リテラル"],
    ["http://[::1]/", "IPv6 リテラル"],
  ])("%s を拒否する（%s）", async (url) => {
    await expect(assertSafeUrl(url)).rejects.toBeInstanceOf(JobPostingFetchError);
  });

  // WHATWG URL は IPv6 を 16 進へ正規化する（[::ffff:169.254.169.254] →
  // [::ffff:a9fe:a9fe]）。ドット表記を前提にした判定はここをすり抜けていた。
  it.each([
    "http://[::ffff:169.254.169.254]/latest/meta-data/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::127.0.0.1]/",
    "http://[64:ff9b::7f00:1]/",
  ])("IPv6 リテラル %s を拒否する", async (url) => {
    await expect(assertSafeUrl(url)).rejects.toBeInstanceOf(JobPostingFetchError);
  });

  it("内部アドレスに解決されるホスト名を拒否する", async () => {
    await expect(assertSafeUrl("https://internal.example.com/")).rejects.toBeInstanceOf(
      JobPostingFetchError,
    );
  });

  it("名前解決できないホスト名を拒否する", async () => {
    await expect(assertSafeUrl("https://unknown.example.com/")).rejects.toBeInstanceOf(
      JobPostingFetchError,
    );
  });
});
