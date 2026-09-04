"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  value: string;
  /** 選べる小分類の一覧。親の大分類が未選択なら空で渡す。 */
  options: readonly string[];
  /** 親（大分類）が選ばれていて、この項目を操作できるか。 */
  enabled: boolean;
  /** 未選択を表す先頭の選択肢の文言。 */
  placeholder: string;
  /** 操作できない状態で押されたときに出す理由。 */
  lockedMessage: string;
  /** フォーム全体を触らせない状態（保存中など）。 */
  disabled?: boolean;
  onChange: (value: string) => void;
};

/**
 * 大分類に依存する小分類の select。
 *
 * 大分類を選ぶまでは選べないが、枠は最初から出しておく（後から現れる項目は
 * 入力し忘れやすい）。選べないことは薄い表示で伝え、それでも押された場合だけ
 * 理由を文章で出す（常設の注意書きで画面を埋めない）。理由は大分類が選ばれれば
 * 自然に消え、大分類を選び直しで空に戻せばまた出る（そのときも説明は要るため）。
 *
 * NOTE: disabled な要素は click を発火しないので、select の pointer-events を切って
 * 外側の枠でクリック／タップを受ける。キーボード操作では disabled の要素は
 * そもそもフォーカスされないため、この枠に別途キー操作を用意する必要はない。
 */
export function DependentSelectField({
  label,
  value,
  options,
  enabled,
  placeholder,
  lockedMessage,
  disabled = false,
  onChange,
}: Props) {
  const id = useId();
  const [lockedMessageShown, setLockedMessageShown] = useState(false);
  const locked = !enabled;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div onClick={() => locked && setLockedMessageShown(true)}>
        <select
          id={id}
          className="input"
          value={value}
          disabled={locked || disabled}
          style={locked ? { pointerEvents: "none" } : undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      {locked && lockedMessageShown && (
        <p
          role="status"
          style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-3)" }}
        >
          {lockedMessage}
        </p>
      )}
    </div>
  );
}
