import { LcLink } from "@/components/ui/icons";

type Props = {
  /** 添える文言。省略するとアイコンだけの控えめな表示になる。 */
  label?: string;
  size?: number;
};

const TITLE = "企業データと紐づけ済み";

/**
 * 入力された企業名が企業マスタと紐づいていることを示す印。
 *
 * 紐づいているかどうかは、練習履歴を企業ごとにまとめられるかを左右するのに、
 * 画面上は「ただ企業名が入っている」状態と見分けがつかない。同じ印を
 * 設定画面・求人の読み込み結果・履歴で使い回し、どこでも同じ意味に見えるようにする。
 *
 * 紐づいていないこと自体は問題ではない（マスタに無い企業でも練習できる）ので、
 * 未紐づけ側には何も出さない。欠落を知らせる警告ではなく、成立を示す印として使う。
 */
export function CompanyLinkBadge({ label, size = 13 }: Props) {
  if (label === undefined) {
    return (
      <span
        role="img"
        aria-label={TITLE}
        title={TITLE}
        style={{ display: "inline-flex", color: "var(--color-accent)" }}
      >
        <LcLink size={size} />
      </span>
    );
  }
  return (
    <span className="tag tag-outline" title={TITLE} style={{ flex: "none" }}>
      <span style={{ display: "inline-flex", color: "var(--color-accent)" }}>
        <LcLink size={size} />
      </span>
      {label}
    </span>
  );
}
