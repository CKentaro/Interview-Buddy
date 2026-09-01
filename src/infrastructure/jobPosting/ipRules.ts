/**
 * IP アドレスの解析と、到達を禁止するレンジの判定。
 *
 * NOTE: 文字列の前方一致で判定してはいけない。WHATWG URL は IPv6 を 16 進表記へ
 * 正規化するため、`http://[::ffff:169.254.169.254]/` の hostname は
 * `[::ffff:a9fe:a9fe]` になる。ドット表記を前提にした照合はすり抜ける。
 * ここでは必ずバイト列へ展開してからレンジを判定する。
 */

/** ドット 10 進の IPv4 を 4 バイトへ。解釈できなければ null。 */
export function parseIpv4(input: string): number[] | null {
  const parts = input.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const value = Number.parseInt(part, 10);
    if (value > 255) {
      return null;
    }
    octets.push(value);
  }
  return octets;
}

/** IPv6 を 8 個の 16bit ワードへ。`::` の省略と末尾の IPv4 記法に対応する。 */
export function parseIpv6(input: string): number[] | null {
  // ゾーン ID（fe80::1%en0）は宛先の識別に関係しないので落とす。
  const address = input.split("%")[0]!;
  const halves = address.split("::");
  if (halves.length > 2) {
    return null;
  }

  const expand = (segment: string): number[] | null => {
    if (segment === "") {
      return [];
    }
    const groups = segment.split(":");
    const words: number[] = [];
    for (const [index, group] of groups.entries()) {
      if (group.includes(".")) {
        // IPv4 記法は末尾グループにのみ現れる（::ffff:127.0.0.1 など）。
        if (index !== groups.length - 1) {
          return null;
        }
        const octets = parseIpv4(group);
        if (octets === null) {
          return null;
        }
        words.push((octets[0]! << 8) | octets[1]!, (octets[2]! << 8) | octets[3]!);
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
        return null;
      }
      words.push(Number.parseInt(group, 16));
    }
    return words;
  };

  const head = expand(halves[0]!);
  const tail = halves.length === 2 ? expand(halves[1]!) : [];
  if (head === null || tail === null) {
    return null;
  }
  const filled = head.length + tail.length;
  if (halves.length === 2) {
    if (filled > 7) {
      return null;
    }
    return [...head, ...new Array<number>(8 - filled).fill(0), ...tail];
  }
  return filled === 8 ? head : null;
}

/**
 * 到達を禁止する IPv4 レンジ。
 * プライベート・ループバック・リンクローカル（クラウドのメタデータ）のほか、
 * 外部の求人ページが存在しえない特殊用途レンジも塞ぐ。
 */
function isBlockedIpv4Octets(octets: number[]): boolean {
  const [a, b] = octets as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 未指定
  if (a === 10) return true; // プライベート
  if (a === 127) return true; // ループバック
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // リンクローカル（メタデータ）
  if (a === 172 && b >= 16 && b <= 31) return true; // プライベート
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF・192.0.2.0/24 TEST-NET-1
  if (a === 192 && b === 168) return true; // プライベート
  if (a === 198 && (b === 18 || b === 19)) return true; // ベンチマーク
  if (a === 198 && b === 51) return true; // TEST-NET-2
  if (a === 203 && b === 0) return true; // TEST-NET-3
  if (a >= 224) return true; // マルチキャスト・予約
  return false;
}

/** 16bit ワード列から、末尾 32bit を IPv4 として取り出す。 */
function embeddedIpv4(words: number[]): number[] {
  return [words[6]! >> 8, words[6]! & 0xff, words[7]! >> 8, words[7]! & 0xff];
}

function isBlockedIpv6Words(words: number[]): boolean {
  const [w0, w1, w2, w3, w4, w5] = words as [number, number, number, number, number, number, number, number];

  if ((w0 & 0xffc0) === 0xfe80) return true; // fe80::/10 リンクローカル
  if ((w0 & 0xfe00) === 0xfc00) return true; // fc00::/7 ユニークローカル
  if ((w0 & 0xff00) === 0xff00) return true; // ff00::/8 マルチキャスト

  const upperIsZero = w0 === 0 && w1 === 0 && w2 === 0 && w3 === 0 && w4 === 0;
  // ::ffff:0:0/96（IPv4 射影）と ::/96（IPv4 互換）。どちらも実体は IPv4 宛て。
  if (upperIsZero && (w5 === 0xffff || w5 === 0)) {
    if (w5 === 0 && words[6] === 0 && (words[7] === 0 || words[7] === 1)) {
      return true; // :: 未指定 / ::1 ループバック
    }
    return isBlockedIpv4Octets(embeddedIpv4(words));
  }
  // 64:ff9b::/96（NAT64）も IPv4 宛てに変換される。
  if (w0 === 0x0064 && w1 === 0xff9b && w2 === 0 && w3 === 0 && w4 === 0 && w5 === 0) {
    return isBlockedIpv4Octets(embeddedIpv4(words));
  }
  // 2002::/16（6to4）は 2〜3 ワード目に IPv4 を埋め込む。
  if (w0 === 0x2002) {
    return isBlockedIpv4Octets([w1 >> 8, w1 & 0xff, w2 >> 8, w2 & 0xff]);
  }
  return false;
}

/**
 * 名前解決済みの IP アドレスが到達を許されるか。
 * IP として解釈できないものは通さない（判定できない宛先は拒否側に倒す）。
 */
export function isBlockedAddress(address: string): boolean {
  const octets = parseIpv4(address);
  if (octets !== null) {
    return isBlockedIpv4Octets(octets);
  }
  const words = parseIpv6(address);
  if (words !== null) {
    return isBlockedIpv6Words(words);
  }
  return true;
}
