import type { CSSProperties, ReactNode } from "react";

const RING_COLORS = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#2ED573", "#0ABDE3",
  "#48DBFB", "#A55EEA", "#F368E0", "#1DD1A1", "#FF6348",
];

function buildRingStyle(amount: number | string | null | undefined, rounded: "full" | "xl" = "full"): CSSProperties | undefined {
  const n = Number(amount);
  if (!n || n <= 0) return undefined;
  const count = Math.min(Math.floor(n / 10_000_000), 10);
  if (count <= 0) return undefined;
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = (i / count) * 360;
    const end = ((i + 1) / count) * 360;
    stops.push(`${RING_COLORS[i]} ${start}deg ${end}deg`);
  }
  return {
    background: `conic-gradient(${stops.join(", ")})`,
    padding: "3px",
    borderRadius: rounded === "full" ? "9999px" : "14px",
    display: "inline-flex",
    flexShrink: 0,
  };
}

interface InvestorRingWrapperProps {
  investmentAmount: number | string | null | undefined;
  rounded?: "full" | "xl";
  children: ReactNode;
  className?: string;
}

export function InvestorRingWrapper({
  investmentAmount,
  rounded = "full",
  children,
  className,
}: InvestorRingWrapperProps) {
  const style = buildRingStyle(investmentAmount, rounded);
  if (!style) return <>{children}</>;
  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
