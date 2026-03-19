import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INVESTOR_RING_COLORS = [
  "#FF6B6B", "#FF9F43", "#FECA57", "#2ED573", "#0ABDE3",
  "#48DBFB", "#A55EEA", "#F368E0", "#1DD1A1", "#FF6348",
];

export function getInvestorRingStyle(investmentLevel: string | number | null | undefined): CSSProperties | undefined {
  const amount = Number(investmentLevel);
  if (!amount || amount <= 0) return undefined;
  const count = Math.min(Math.floor(amount / 10_000_000), 10);
  if (count <= 0) return undefined;
  const stops: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = (i / count) * 360;
    const end = ((i + 1) / count) * 360;
    stops.push(`${INVESTOR_RING_COLORS[i]} ${start}deg ${end}deg`);
  }
  return {
    background: `conic-gradient(${stops.join(", ")})`,
    padding: "3px",
  };
}
