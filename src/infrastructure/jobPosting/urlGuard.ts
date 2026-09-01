/**
 * ユーザーが入力した URL をサーバーから取得する際の SSRF 対策。
 *
 * このアプリはユーザーが渡した任意の URL をサーバー側で fetch する。防御が無いと
 * クラウドのメタデータエンドポイント（169.254.169.254）や社内ネットワークへの
 * 踏み台にされるため、スキーム・宛先 IP を必ず検証する。
 *
 * ホスト名の文字列ではなく、名前解決した結果の IP アドレスを検査する。
 * リダイレクトも各ホップで同じ検証を通すこと（{@link HttpJobPostingFetcher} が実施する）。
 *
 * 既知の限界: ここで検証したアドレスと、実際に fetch が接続するアドレスは別々の
 * 名前解決の結果であり、その間に応答が変わる DNS rebinding は防げていない。
 * 塞ぐには検証済み IP へ直接接続する（undici の Agent に自前 lookup を挿す）必要が
 * あり、依存追加を伴うため PoC では見送っている。
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import {
  JobPostingFetchError,
  JobPostingFetchFailureReason,
} from "@/domain/interview/ports/IJobPostingFetcher";
import { isBlockedAddress } from "./ipRules";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
/**
 * 接続を許すポート。求人ページは標準ポートで公開されており、任意ポートを
 * 許すとサーバーを踏み台にしたポートスキャンの手段になる。
 */
const ALLOWED_PORTS = new Set(["", "80", "443"]);

function invalidUrl(message: string): JobPostingFetchError {
  return new JobPostingFetchError(
    JobPostingFetchFailureReason.INVALID_URL,
    message,
  );
}

/**
 * URL を検証し、正規化した URL を返す。
 * スキームが http(s) でない、または宛先が到達禁止アドレスなら例外を投げる。
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw invalidUrl(`URL として解釈できません: ${rawUrl}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw invalidUrl(`許可されないスキームです: ${url.protocol}`);
  }
  // 認証情報つき URL（http://user:pass@host）は攻撃の常套手段のため拒否する。
  if (url.username !== "" || url.password !== "") {
    throw invalidUrl("認証情報を含む URL は指定できません");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw invalidUrl(`許可されないポートです: ${url.port}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  // ホスト名が IP リテラルならそのまま、ドメイン名なら名前解決して検査する。
  if (isIP(hostname) !== 0) {
    if (isBlockedAddress(hostname)) {
      throw invalidUrl(`到達が許可されないアドレスです: ${hostname}`);
    }
    return url;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new JobPostingFetchError(
      JobPostingFetchFailureReason.UNREACHABLE,
      `ホスト名を解決できません: ${hostname}`,
    );
  }
  // 1 つでも内部アドレスを含むなら拒否する（DNS rebinding 対策）。
  if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
    throw invalidUrl(`到達が許可されないアドレスに解決されました: ${hostname}`);
  }
  return url;
}

/** IP レンジ判定は {@link ./ipRules} に集約している（既存の import 経路を保つ再輸出）。 */
export { isBlockedAddress } from "./ipRules";
