"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { CompanyResponse, CompanySearchResponse } from "@/app/api/types";
import { CompanyLinkBadge } from "./CompanyLinkBadge";

type Props = {
  label: string;
  /** 表示中の企業名（自由入力・候補選択のどちらでもここに入る）。 */
  value: string;
  /** 候補から選んだときだけ企業マスタの ID。自由入力に戻したら null。 */
  companyId: string | null;
  placeholder?: string;
  onChange: (value: string, companyId: string | null) => void;
};

/** 入力が止まってから検索するまでの待ち時間。打鍵ごとに投げない。 */
const DEBOUNCE_MS = 250;

/**
 * 企業名の入力欄。入力に応じて企業マスタの候補を出し、選ぶと企業 ID を紐づける。
 *
 * マスタ（EDINET 由来）は日本の全法人ではないので、**候補を選ばずに打ちっぱなしでも
 * そのまま先へ進める**ことを最優先にしている。候補は「あれば助かる」補助であり、
 * 検索に失敗しても入力を妨げない（エラーは出さず候補を閉じるだけ）。
 */
export function CompanyCombobox({
  label,
  value,
  companyId,
  placeholder,
  onChange,
}: Props) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [candidates, setCandidates] = useState<CompanyResponse[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  /** 直前に候補から選んだ名前。選んだ直後に再検索して候補を開き直さないための目印。 */
  const justSelectedRef = useRef<string | null>(null);
  /**
   * この欄でユーザーが実際に打鍵したか。
   * 求人 URL の読み込みや「同じ設定でもう一度」で企業名が入った状態でこのステップに
   * 来ることがあり、そのまま検索すると触ってもいない入力欄の下に候補が開いてしまう。
   * 打鍵があるまでは検索そのものを行わない。
   */
  const typedRef = useRef(false);

  useEffect(() => {
    if (!typedRef.current) return;
    if (justSelectedRef.current === value) return;
    const query = value.trim();

    let cancelled = false;
    // 候補の消去も含めて遅延させる（effect の本体で setState しないため）。
    const timer = setTimeout(() => {
      if (query.length < 2) {
        setCandidates([]);
        setOpen(false);
        return;
      }
      fetch(`/api/companies?q=${encodeURIComponent(query)}`)
        .then((response) => (response.ok ? (response.json() as Promise<CompanySearchResponse>) : null))
        .then((result) => {
          if (cancelled || result === null) return;
          setCandidates(result.companies);
          setActiveIndex(-1);
          if (result.companies.length > 0) setOpen(true);
        })
        .catch(() => {
          /* 候補は補助機能。取得できなくても手入力で先へ進める */
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  /*
   * 閉じるときは活性項目も必ず戻す。
   * マウスを通しただけの候補（onMouseEnter）で activeIndex が動くため、これを
   * 残したまま閉じて開き直すと、入力中の企業名が Enter で意図しない候補に
   * 差し替わってしまう。閉じる操作はすべてこの関数を通す。
   */
  const closeList = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  // 外側をクリックしたら候補を閉じる（選択は確定済みの値をそのまま残す）。
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeList();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const select = (company: CompanyResponse) => {
    justSelectedRef.current = company.name;
    typedRef.current = false;
    onChange(company.name, company.id);
    // 選んだ候補は破棄する。残しておくと、入力欄に戻っただけで古い候補が開き直す。
    setCandidates([]);
    closeList();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || candidates.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + delta + candidates.length) % candidates.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      // 候補を選んでいるときだけ Enter を奪う（そうでなければフォームの操作を邪魔しない）。
      event.preventDefault();
      const picked = candidates[activeIndex];
      if (picked) select(picked);
    } else if (event.key === "Escape") {
      closeList();
    }
  };

  return (
    <div className="field" ref={containerRef} style={{ position: "relative" }}>
      <label htmlFor={id}>{label}</label>
      <div style={{ position: "relative", display: "flex" }}>
        <input
          id={id}
          className="input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          // 紐づいているときは、印の分だけ右側を空けて文字が重ならないようにする。
          style={companyId !== null ? { paddingInlineEnd: 34 } : undefined}
          onChange={(e) => {
            justSelectedRef.current = null;
            typedRef.current = true;
            setActiveIndex(-1);
            // 手で書き換えた時点で「マスタの企業を選んだ状態」ではなくなる。
            onChange(e.target.value, null);
          }}
          onFocus={() => { if (candidates.length > 0) setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {companyId !== null && (
          <span style={{ position: "absolute", insetInlineEnd: 11, top: "50%", transform: "translateY(-50%)", display: "inline-flex" }}>
            <CompanyLinkBadge size={15} />
          </span>
        )}
      </div>

      {open && candidates.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: "absolute", zIndex: 20, insetInline: 0, top: "100%", marginTop: 4,
            listStyle: "none", padding: 4, maxHeight: 260, overflowY: "auto",
            background: "var(--color-bg)", border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-pop, 0 8px 24px rgb(0 0 0 / 0.12))",
          }}
        >
          {candidates.map((company, index) => (
            <li
              key={company.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // 入力欄からフォーカスが外れて候補が閉じる前に、選択を確定させる。
              onPointerDown={(e) => { e.preventDefault(); select(company); }}
              onMouseEnter={() => setActiveIndex(index)}
              style={{
                display: "flex", alignItems: "baseline", gap: 8,
                padding: "8px 10px", cursor: "pointer",
                borderRadius: "var(--radius-sm)",
                background: index === activeIndex ? "var(--color-surface)" : "transparent",
              }}
            >
              <span style={{ fontSize: 13.5, minWidth: 0 }}>{company.name}</span>
              <span className="num" style={{ fontSize: 11.5, color: "var(--ink-3)", flex: "none" }}>
                {company.securitiesCode ?? (company.isListed ? "上場" : "非上場")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
