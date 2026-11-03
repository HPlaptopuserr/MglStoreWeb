"use client";

import type { CSSProperties } from "react";
import type { CustomerDisplayDetails } from "../types/customer-display.types";
import { CustomerDisplayHeader } from "./customer-display/CustomerDisplayHeader";
import { CustomerDisplayItems } from "./customer-display/CustomerDisplayItems";
import {
  CustomerDisplaySummary,
  CustomerDisplayWelcome,
} from "./customer-display/CustomerDisplaySummary";
import styles from "./customer-display/CustomerDisplay.module.css";
import type { CartLine, CartTotals } from "../types/pos.types";

export const CUSTOMER_DISPLAY_THEME_STORAGE_KEY =
  "mgl_pos_customer_display_theme";

export const CUSTOMER_DISPLAY_THEME_OPTIONS = [
  { id: "violet", label: "Нил ягаан", swatch: "#8b5cf6" },
  { id: "blue", label: "Цэнхэр", swatch: "#06b6d4" },
  { id: "emerald", label: "Ногоон", swatch: "#22c55e" },
  { id: "amber", label: "Улбар", swatch: "#f59e0b" },
  { id: "rose", label: "Ягаан", swatch: "#ec4899" },
  { id: "white", label: "Цагаан", swatch: "#f8fafc" },
] as const;

export type CustomerDisplayThemeId =
  (typeof CUSTOMER_DISPLAY_THEME_OPTIONS)[number]["id"];

const CUSTOMER_DISPLAY_THEME_STYLES: Record<
  CustomerDisplayThemeId,
  {
    accent: string;
    soft: string;
  }
> = {
  violet: {
    accent: "#7c3aed",
    soft: "#f5f3ff",
  },
  blue: {
    accent: "#0284c7",
    soft: "#eff6ff",
  },
  emerald: {
    accent: "#059669",
    soft: "#ecfdf5",
  },
  amber: {
    accent: "#d97706",
    soft: "#fffbeb",
  },
  rose: {
    accent: "#e11d48",
    soft: "#fff1f2",
  },
  white: {
    accent: "#2563eb",
    soft: "#f8fafc",
  },
};

export function isCustomerDisplayThemeId(
  value: unknown,
): value is CustomerDisplayThemeId {
  return CUSTOMER_DISPLAY_THEME_OPTIONS.some((option) => option.id === value);
}

type Props = CustomerDisplayDetails & {
  lines: CartLine[];
  totals: CartTotals;
  storeName?: string;
  theme?: CustomerDisplayThemeId;
};

export function PosCustomerDisplay({
  lines,
  totals,
  storeName = "MGL STORE",
  registerName,
  branchName,
  cashierName,
  loyaltyPoints,
  theme = "white",
}: Props) {
  const themeStyle = CUSTOMER_DISPLAY_THEME_STYLES[theme];
  const displayStyle = {
    "--cd-accent": themeStyle.accent,
    "--cd-soft": themeStyle.soft,
  } as CSSProperties;
  return (
    <div className={styles.screen} style={displayStyle}>
      <CustomerDisplayHeader
        storeName={storeName}
        registerName={registerName}
        hasItems={lines.length > 0}
      />
      <main className={styles.workspace}>
        <CustomerDisplayItems lines={lines} />
        <aside className={styles.sidebar}>
          <CustomerDisplayWelcome points={loyaltyPoints} />
          <CustomerDisplaySummary
            totals={totals}
            hasItems={lines.length > 0}
            points={loyaltyPoints}
          />
        </aside>
      </main>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400">
        <span>
          {cashierName
            ? `Кассчин: ${cashierName}`
            : "Танд үйлчлэхэд таатай байна"}
          {branchName ? ` · ${branchName}` : ""}
        </span>
        <span>Худалдан авалт хийсэнд баярлалаа · MGL STORE</span>
      </footer>
    </div>
  );
}
