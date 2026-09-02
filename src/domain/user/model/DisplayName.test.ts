import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeDisplayName,
} from "./DisplayName.vo";

describe("normalizeDisplayName", () => {
  it("前後の空白を落とし、連続する空白を 1 つにまとめる", () => {
    expect(normalizeDisplayName("  面接　 太郎  ")).toBe("面接 太郎");
  });

  it("空文字・空白のみ・null → 未設定（null）", () => {
    expect(normalizeDisplayName("")).toBeNull();
    expect(normalizeDisplayName("   ")).toBeNull();
    expect(normalizeDisplayName(null)).toBeNull();
    expect(normalizeDisplayName(undefined)).toBeNull();
  });

  it("上限を超える分は切り詰める", () => {
    const long = "あ".repeat(DISPLAY_NAME_MAX_LENGTH + 10);
    expect(normalizeDisplayName(long)).toHaveLength(DISPLAY_NAME_MAX_LENGTH);
  });
});
