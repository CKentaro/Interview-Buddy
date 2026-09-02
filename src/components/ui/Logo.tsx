type LogoProps = {
  size?: number;
  subtitle?: string;
  color?: string;
};

/**
 * Wordmark for Interview Buddy — flat Archivo lockup, no glyph.
 * `subtitle` shows the small caption line used in the app sidebar.
 */
export function Logo({ size = 18, subtitle, color = "var(--color-text)" }: LogoProps) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "-0.02em",
          color,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
        }}
      >
        interview buddy
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
