/* Shared SVG icon components used across the app */

import type { ReactNode } from "react";

/* ── Lucide-style icon set (24×24, 2px stroke) used by the Modernist design ── */
function Lucide({ size = 18, sw = 2, children }: { size?: number; sw?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
      {children}
    </svg>
  );
}

export function LcHome({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></Lucide>;
}
export function LcHistory({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M3 7v4h4" /></Lucide>;
}
export function LcUser({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Lucide>;
}
export function LcLogout({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><line x1="21" y1="12" x2="9" y2="12" /></Lucide>;
}
export function LcMessage({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Lucide>;
}
export function LcEye({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Lucide>;
}
export function LcSliders({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="currentColor" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="16" cy="12" r="2" fill="currentColor" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="11" cy="18" r="2" fill="currentColor" /></Lucide>;
}
export function LcArrowLeft({ size = 15 }: { size?: number }) {
  return <Lucide size={size}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></Lucide>;
}
export function LcArrowRight({ size = 16 }: { size?: number }) {
  return <Lucide size={size}><path d="M9 18l6-6-6-6" /></Lucide>;
}
export function LcArrowUp({ size = 18 }: { size?: number }) {
  return <Lucide size={size} sw={2.2}><line x1="12" y1="19" x2="12" y2="5" /><path d="M6 11l6-6 6 6" /></Lucide>;
}
export function LcChevronDown({ size = 16, open }: { size?: number; open?: boolean }) {
  return <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .15s ease" }}><Lucide size={size}><path d="M6 9l6 6 6-6" /></Lucide></span>;
}
export function LcMic({ size = 19 }: { size?: number }) {
  return <Lucide size={size}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /></Lucide>;
}
export function LcCheck({ size = 20 }: { size?: number }) {
  return <Lucide size={size} sw={2.4}><path d="M20 6L9 17l-5-5" /></Lucide>;
}
export function LcAlert({ size = 18 }: { size?: number }) {
  return <Lucide size={size} sw={2.2}><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="16" x2="12" y2="16.01" /><circle cx="12" cy="12" r="9" /></Lucide>;
}
export function LcInbox({ size = 32 }: { size?: number }) {
  return <Lucide size={size}><path d="M4 8V5a1 1 0 0 1 1-1h3" /><path d="M20 8V5a1 1 0 0 0-1-1h-3" /><path d="M4 16v3a1 1 0 0 0 1 1h3" /><path d="M20 16v3a1 1 0 0 1-1 1h-3" /><path d="M9 12h6" /></Lucide>;
}
export function LcRepeat({ size = 15 }: { size?: number }) {
  return <Lucide size={size}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></Lucide>;
}
export function LcScale({ size = 15 }: { size?: number }) {
  return <Lucide size={size}><line x1="12" y1="3" x2="12" y2="21" /><path d="M5 7l-3 7a3 3 0 0 0 6 0l-3-7z" /><path d="M19 7l-3 7a3 3 0 0 0 6 0l-3-7z" /><line x1="5" y1="7" x2="19" y2="7" /><path d="M8 21h8" /></Lucide>;
}
export function LcCompass({ size = 15 }: { size?: number }) {
  return <Lucide size={size}><circle cx="12" cy="12" r="10" /><path d="M16 8l-2 6-6 2 2-6 6-2z" /></Lucide>;
}
export function LcPanelLeft({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></Lucide>;
}
export function LcMenu({ size = 20 }: { size?: number }) {
  return <Lucide size={size}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Lucide>;
}
export function LcLink({ size = 14 }: { size?: number }) {
  return <Lucide size={size}><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 0 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" /></Lucide>;
}
export function LcClose({ size = 20 }: { size?: number }) {
  return <Lucide size={size}><line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" /></Lucide>;
}
export function LcHelpCircle({ size = 18 }: { size?: number }) {
  return <Lucide size={size}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.5 2.1c-.8.4-1.2.9-1.2 1.9" /><line x1="12" y1="16.5" x2="12" y2="16.51" /></Lucide>;
}
/* Google の G マークをここに置いてはいけない。ブランディング ガイドラインが自作・改変・
   単色化を禁じているため、公式アセットから切り出した public/google-g.svg を
   <img> で読み込むこと。→ .btn-google（globals.css） */

export function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 7l6-5 6 5v6.5a.5.5 0 0 1-.5.5h-3v-4h-5v4h-3a.5.5 0 0 1-.5-.5V7z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconList({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4h10M3 8h10M3 12h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconUser({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="2.7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.8 13.6c.7-2.2 2.7-3.6 5.2-3.6s4.5 1.4 5.2 3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLogout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5M10 5l3 3-3 3M13 8H6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M13 8H3M7 4 3 8l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevron({ open, size = 14 }: { open?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "rotate(0)" }}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSidebar({ collapsed, size = 16 }: { collapsed?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2.25" stroke="currentColor" strokeWidth="1.3" />
      <line x1="6.25" y1="2.75" x2="6.25" y2="13.25" stroke="currentColor" strokeWidth="1.3" />
      {/* Filled left panel when expanded; hollow when collapsed */}
      <rect
        x="1.75"
        y="2.75"
        width="4.5"
        height="10.5"
        rx="2.25"
        fill="currentColor"
        style={{ opacity: collapsed ? 0 : 0.32, transition: "opacity .2s ease" }}
      />
    </svg>
  );
}

export function IconPlay({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 3l9 5-9 5V3z" fill="currentColor" />
    </svg>
  );
}

export function IconClock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6 3.5V6l1.7 1.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconMic({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="6" y="2" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 8a4 4 0 0 0 8 0M8 12v2M5.5 14h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSend({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8 14 2l-4 12-2-5-6-1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function IconClose({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 3l10 10M13 3 3 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconStop({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconCaret({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

