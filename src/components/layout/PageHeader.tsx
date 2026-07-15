import type { ReactNode } from "react";
import Link from "next/link";
import { LcArrowLeft } from "@/components/ui/icons";

const muted = (p: number) => `color-mix(in srgb, var(--color-text) ${p}%, transparent)`;

type PageHeaderProps = {
  /** The page's main heading (rendered as the single <h1>). */
  title: string;
  /** A short line under the title giving context. */
  subtitle?: string;
  /** Optional back link shown above the title. */
  back?: { href: string; label: string };
  /** Optional element aligned to the right (actions). */
  right?: ReactNode;
};

/**
 * In-content page header — sits at the top of a page's <main>, not as a
 * separate sticky chrome bar. Carries the page's single <h1>.
 */
export function PageHeader({ title, subtitle, back, right }: PageHeaderProps) {
  return (
    <div className="ib-section" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        {back && (
          <Link
            href={back.href}
            className="ib-link"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 8 }}
          >
            <LcArrowLeft size={14} />
            <span>{back.label}</span>
          </Link>
        )}
        <h1 style={{ fontSize: 26, margin: 0, lineHeight: 1.25 }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: "6px 0 0", fontSize: 13, color: muted(60), fontFamily: "var(--font-jp)" }}>{subtitle}</p>
        )}
      </div>
      {right && <div style={{ flex: "none" }}>{right}</div>}
    </div>
  );
}
