import { describe, expect, it } from "vitest";

import { htmlToText } from "./htmlToText";

describe("htmlToText", () => {
  it("script / style の中身を本文に含めない", () => {
    const text = htmlToText(
      "<p>募集要項</p><script>var a = '応募資格';</script><style>.a{color:red}</style>",
    );

    expect(text).toContain("募集要項");
    expect(text).not.toContain("応募資格");
    expect(text).not.toContain("color:red");
  });

  it("閉じタグが無い script は以降を全て中身とみなして落とす", () => {
    expect(htmlToText("<p>本文</p><script>var a = 1;")).toBe("本文");
  });

  it("自己閉じの svg / iframe は以降の本文を巻き込まない", () => {
    expect(htmlToText('<p>本文A</p><svg class="i"/><p>本文B 募集要項</p>')).toBe(
      "本文A\n本文B 募集要項",
    );
    expect(htmlToText('<p>a</p><iframe src="x"/><p>職務内容</p>')).toBe("a\n職務内容");
  });

  it("コメントアウトされた script を本物と誤認しない", () => {
    expect(htmlToText("<!-- <script src=x> --><p>本文C</p>")).toBe("本文C");
  });

  it("タグを改行に潰し、項目の行を保つ", () => {
    const text = htmlToText("<tr><th>勤務地</th><td>東京都</td></tr>");

    expect(text.split("\n")).toEqual(["勤務地", "東京都"]);
  });

  it("文字参照をデコードする", () => {
    expect(htmlToText("<p>R&amp;D&nbsp;職&#12539;年収&#x00A5;500万</p>")).toBe(
      "R&D 職・年収¥500万",
    );
  });

  it("不正な数値参照はそのまま残す", () => {
    expect(htmlToText("<p>&#xZZZ;</p>")).toBe("&#xZZZ;");
  });

  it("連続する空白・空行を畳む", () => {
    expect(htmlToText("<div>  a  </div>\n\n\n<div>  b  </div>")).toBe("a\nb");
  });
});
