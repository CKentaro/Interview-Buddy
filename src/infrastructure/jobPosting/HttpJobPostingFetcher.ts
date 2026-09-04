import type {
  FetchedPage,
  IJobPostingFetcher,
} from "@/domain/interview/ports/IJobPostingFetcher";
import {
  JobPostingFetchError,
  JobPostingFetchFailureReason,
} from "@/domain/interview/ports/IJobPostingFetcher";
import { htmlToText } from "./htmlToText";
import { assertSafeUrl } from "./urlGuard";

/** 1 ページの取得に許す時間。求人サイトは重いページもあるため長めに取る。 */
const TIMEOUT_MS = 12_000;
/** 読み込む HTML の上限。これを超えた分は捨てる（本文は先頭側に十分含まれる）。 */
const MAX_HTML_BYTES = 3_000_000;
/** LLM に渡す本文の上限。求人票 1 件はおおむね 1 万字未満に収まる。 */
const MAX_TEXT_CHARS = 12_000;
/**
 * リダイレクトの追跡回数。各ホップで SSRF 検証をやり直す。
 * 1 ホップごとに TIMEOUT_MS の予算があるため、増やすほど 1 リクエストが
 * 占有しうる時間が伸びる。求人ページの正規化に必要な範囲に絞る。
 */
const MAX_REDIRECTS = 3;
/** これ未満の本文は「取得できなかった」とみなす閾値（CSR・ログイン要求ページ対策）。 */
const MIN_TEXT_CHARS = 200;

/**
 * 実在するブラウザに近い UA を名乗る。既定の UA（Node/undici）は多くの求人
 * サイトで弾かれるため。ボットとして識別できるよう製品名も併記する。
 */
const USER_AGENT =
  "Mozilla/5.0 (compatible; interview-buddy/1.0; +https://github.com/CKentaro/interview-buddy)";

/**
 * IJobPostingFetcher の HTTP 実装。
 *
 * 検証で分かっているとおり、取得可否はサイト側の事情（WAF・CSR・ログイン要求）で
 * 決まり、こちらの実装では変えられない。取得できない場合は理由つきで失敗させ、
 * 呼び出し側が手入力へフォールバックできるようにするのがこのクラスの責務。
 */
export class HttpJobPostingFetcher implements IJobPostingFetcher {
  async fetch(url: string): Promise<FetchedPage> {
    let currentUrl = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // リダイレクト先も毎回検証する。初回だけの検証では、外部ホストから
      // 内部アドレスへ 302 させる迂回を許してしまう。
      const safeUrl = await assertSafeUrl(currentUrl);
      const response = await this.request(safeUrl);

      if (isRedirect(response.status)) {
        await discardBody(response);
        const location = response.headers.get("location");
        if (!location) {
          throw new JobPostingFetchError(
            JobPostingFetchFailureReason.UNREACHABLE,
            `リダイレクト先が示されていません (${response.status})`,
          );
        }
        currentUrl = new URL(location, safeUrl).toString();
        continue;
      }

      if (!response.ok) {
        await discardBody(response);
        throw new JobPostingFetchError(
          JobPostingFetchFailureReason.UNREACHABLE,
          `取得に失敗しました (HTTP ${response.status})`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        await discardBody(response);
        throw new JobPostingFetchError(
          JobPostingFetchFailureReason.UNSUPPORTED_CONTENT,
          `HTML ではありません (${contentType || "不明"})`,
        );
      }

      let html: string;
      try {
        html = await readCapped(response, contentType);
      } catch (error) {
        // タイムアウトはボディのストリームにも効く。ヘッダだけ即返して本文を
        // 遅く流すサイトではここで中断されるため、取得失敗として扱う。
        throw new JobPostingFetchError(
          JobPostingFetchFailureReason.UNREACHABLE,
          `本文の読み取りに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
      if (text.length < MIN_TEXT_CHARS) {
        // HTTP 200 でも本文が無いことがある（JS 描画・ログイン要求・soft 404）。
        throw new JobPostingFetchError(
          JobPostingFetchFailureReason.EMPTY_CONTENT,
          `本文を取得できませんでした（${text.length} 字）`,
        );
      }
      return { finalUrl: safeUrl.toString(), text };
    }

    throw new JobPostingFetchError(
      JobPostingFetchFailureReason.UNREACHABLE,
      "リダイレクトが多すぎます",
    );
  }

  private async request(url: URL): Promise<Response> {
    try {
      return await fetch(url, {
        // リダイレクトは自前で追う（各ホップを SSRF 検証に通すため）。
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ja,en;q=0.8",
        },
      });
    } catch (error) {
      // WAF による遮断はここに来る（TLS ハンドシェイク段階で切られる）。
      throw new JobPostingFetchError(
        JobPostingFetchFailureReason.UNREACHABLE,
        `接続できませんでした: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

/** 読み捨てるボディを明示的に閉じ、コネクションが滞留しないようにする。 */
async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {
    /* 読み捨てに伴う失敗は無視してよい */
  });
}

/**
 * Content-Type の charset を取り出す。日本の求人ページには Shift_JIS の
 * ページが現存し、UTF-8 固定でデコードすると本文が全て文字化けする。
 */
function resolveCharset(contentType: string): string {
  const matched = /charset\s*=\s*"?([\w-]+)"?/i.exec(contentType);
  return matched?.[1] ?? "utf-8";
}

/**
 * 本文を上限バイトまで読む。Content-Length を信用せず実データで打ち切ることで、
 * 巨大なページや Content-Length 詐称でメモリを食い潰されるのを防ぐ。
 */
async function readCapped(response: Response, contentType: string): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {
      /* 打ち切りに伴う cancel の失敗は無視してよい */
    });
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder(resolveCharset(contentType)).decode(merged);
  } catch {
    // 未知の charset 名は UTF-8 として読む（TextDecoder は未対応名で例外を投げる）。
    return new TextDecoder("utf-8").decode(merged);
  }
}
