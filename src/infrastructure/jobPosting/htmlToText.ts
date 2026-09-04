/**
 * HTML から本文テキストだけを取り出す。
 *
 * 求人ページの解析に必要なのは可視テキストだけで、タグ・スクリプト・スタイルは
 * ノイズかつトークンの無駄になる。外部ライブラリを増やさず、既知のノイズ要素を
 * 落として空白を正規化する最小の実装に留める。
 */

/**
 * 中身ごと落とす要素のうち、閉じタグが無ければ以降を全て中身とみなすもの。
 * ブラウザの解析と同じ扱いで、JS/CSS のソースが本文に混ざるのを防ぐ。
 */
const RAW_TEXT_ELEMENTS = ["script", "style", "noscript"];

/**
 * 中身ごと落とすが、閉じタグが無くても以降を巻き込まない要素。
 * XHTML では `<svg .../>` のような自己閉じが正当な書き方であり、閉じタグが
 * 無いことを理由に以降を捨てると本文が丸ごと消える。
 */
const CONTAINER_ELEMENTS = ["svg", "template", "iframe"];

/** 名前付き文字参照のうち、求人ページで実際に現れるもの。 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  yen: "¥",
  middot: "・",
  hellip: "…",
  mdash: "—",
  ndash: "–",
};

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#")) {
      const codePoint = body.startsWith("#x") || body.startsWith("#X")
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      // 不正な数値参照はデコードせず、元の文字列のまま残す。
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function dropPaired(text: string, element: string): string {
  return text.replace(
    new RegExp(`<${element}\\b[^>]*>[\\s\\S]*?</${element}\\s*>`, "gi"),
    " ",
  );
}

/** HTML を可視テキストへ変換する。 */
export function htmlToText(html: string): string {
  // コメントを先に落とす。コメントアウトされた <script> を本物と誤認すると、
  // 以降を全て捨ててしまい本文が消える。
  let text = html.replace(/<!--[\s\S]*?-->/g, " ");

  for (const element of RAW_TEXT_ELEMENTS) {
    text = dropPaired(text, element);
    // 閉じタグが無い場合はブラウザと同じく以降を全て中身とみなす。
    text = text.replace(new RegExp(`<${element}\\b[^>]*>[\\s\\S]*$`, "i"), " ");
  }
  for (const element of CONTAINER_ELEMENTS) {
    text = dropPaired(text, element);
    // 自己閉じ（<svg ... />）は開始タグだけを落とす。以降は巻き込まない。
    text = text.replace(new RegExp(`<${element}\\b[^>]*/>`, "gi"), " ");
  }
  // タグは改行に潰す。求人票は表・リストで構造化されており、行の区切りを
  // 保つほうが LLM が項目（応募資格・勤務地など）を読み取りやすい。
  text = text.replace(/<[^>]*>/g, "\n");
  text = decodeEntities(text);
  text = text.replace(/[ \t 　]+/g, " ");
  text = text.replace(/[ \t]*\n[ \t]*/g, "\n");
  text = text.replace(/\n{2,}/g, "\n");
  return text.trim();
}
