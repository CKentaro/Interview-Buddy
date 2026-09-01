import { describe, expect, it } from "vitest";

import { isBlockedAddress, parseIpv4, parseIpv6 } from "./ipRules";

describe("parseIpv4", () => {
  it("ドット 10 進を 4 バイトへ変換する", () => {
    expect(parseIpv4("169.254.169.254")).toEqual([169, 254, 169, 254]);
  });

  it.each(["256.0.0.1", "1.2.3", "1.2.3.4.5", "a.b.c.d", ""])(
    "不正な表記 %s は null",
    (input) => {
      expect(parseIpv4(input)).toBeNull();
    },
  );
});

describe("parseIpv6", () => {
  it("`::` を展開する", () => {
    expect(parseIpv6("::1")).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it("末尾の IPv4 記法を 2 ワードへ畳む", () => {
    expect(parseIpv6("::ffff:127.0.0.1")).toEqual([0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
  });

  it("省略なしの 8 グループを解釈する", () => {
    expect(parseIpv6("2606:2800:220:1:248:1893:25c8:1946")).toEqual([
      0x2606, 0x2800, 0x220, 1, 0x248, 0x1893, 0x25c8, 0x1946,
    ]);
  });

  it.each(["1::2::3", "12345::1", "::1:2:3:4:5:6:7:8", "gggg::1"])(
    "不正な表記 %s は null",
    (input) => {
      expect(parseIpv6(input)).toBeNull();
    },
  );
});

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254", // クラウドのメタデータ
    "0.0.0.0",
    "100.64.0.1",
    "198.18.0.1",
    "::",
    "::1",
    "fd00::1",
    "fe80::1",
    "ff02::1",
  ])("内部アドレス %s を拒否する", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  // WHATWG URL が 16 進へ正規化した後の表記。ドット表記だけ見ていると通り抜ける。
  it.each([
    ["::ffff:a9fe:a9fe", "IPv4 射影のメタデータ"],
    ["::ffff:7f00:1", "IPv4 射影のループバック"],
    ["::7f00:1", "IPv4 互換のループバック"],
    ["64:ff9b::7f00:1", "NAT64 のループバック"],
    ["2002:7f00:1::", "6to4 のループバック"],
  ])("16 進正規化された %s を拒否する（%s）", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946", "::ffff:5db8:d822"])(
    "外部アドレス %s は許可する",
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    },
  );

  it("IP として解釈できない文字列は拒否する", () => {
    expect(isBlockedAddress("example.com")).toBe(true);
  });
});
