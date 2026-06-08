type LogoProps = {
  size?: number;
  color?: string;
  showName?: boolean;
  nameSize?: number;
};

export function Logo({
  size = 28,
  color = "var(--ink)",
  showName = true,
  nameSize = 18,
}: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="7" fill={color} />
        <circle cx="12" cy="14" r="2.2" fill="var(--bg)" />
        <circle cx="20" cy="14" r="2.2" fill="var(--teal)" />
        <path
          d="M11 21c1.4 1.4 3.1 2 5 2s3.6-.6 5-2"
          stroke="var(--bg)"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showName && (
        <span
          style={{
            fontWeight: 700,
            fontSize: nameSize,
            letterSpacing: -0.2,
            color,
          }}
        >
          Interview Buddy
        </span>
      )}
    </div>
  );
}
