import type { ReactNode } from "react";

type AppTopBarProps = {
  left: ReactNode;
  right?: ReactNode;
};

export function AppTopBar({ left, right }: AppTopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 48px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {left}
      {right && <div>{right}</div>}
    </div>
  );
}
