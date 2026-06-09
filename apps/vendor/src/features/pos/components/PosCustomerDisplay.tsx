"use client";

import type { CSSProperties } from "react";
import { ReceiptText, ShoppingBag, Sparkles, Star } from "lucide-react";
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
    accentRgb: string;
    borderStart: string;
    borderEnd: string;
    soft: string;
  }
> = {
  violet: {
    accent: "#7c3aed",
    accentRgb: "124, 58, 237",
    borderStart: "#6366f1",
    borderEnd: "#ec4899",
    soft: "#f5f3ff",
  },
  blue: {
    accent: "#0284c7",
    accentRgb: "2, 132, 199",
    borderStart: "#2563eb",
    borderEnd: "#06b6d4",
    soft: "#eff6ff",
  },
  emerald: {
    accent: "#059669",
    accentRgb: "5, 150, 105",
    borderStart: "#16a34a",
    borderEnd: "#14b8a6",
    soft: "#ecfdf5",
  },
  amber: {
    accent: "#d97706",
    accentRgb: "217, 119, 6",
    borderStart: "#f59e0b",
    borderEnd: "#fb7185",
    soft: "#fffbeb",
  },
  rose: {
    accent: "#e11d48",
    accentRgb: "225, 29, 72",
    borderStart: "#fb7185",
    borderEnd: "#a855f7",
    soft: "#fff1f2",
  },
  white: {
    accent: "#2563eb",
    accentRgb: "37, 99, 235",
    borderStart: "#3b82f6",
    borderEnd: "#f43f5e",
    soft: "#f8fafc",
  },
};

export function isCustomerDisplayThemeId(
  value: unknown,
): value is CustomerDisplayThemeId {
  return CUSTOMER_DISPLAY_THEME_OPTIONS.some((option) => option.id === value);
}

type Props = {
  lines: CartLine[];
  totals: CartTotals;
  storeName?: string;
  theme?: CustomerDisplayThemeId;
};

function formatMoney(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("mn-MN")}₮`;
}

function getLineTotal(line: CartLine) {
  return Math.max(0, line.qty * line.unitPrice - line.discountAmount);
}

export function PosCustomerDisplay({
  lines,
  totals,
  storeName = "MGLSTORE",
  theme = "white",
}: Props) {
  const savings = Math.max(0, totals.discountTotal);
  const latestProductId = lines[lines.length - 1]?.productId;
  const hasItems = lines.length > 0;
  const estimatedPoints = Math.floor(Math.max(0, totals.grandTotal) / 100);
  const themeStyle = CUSTOMER_DISPLAY_THEME_STYLES[theme];
  const progressWidth = Math.min(100, Math.max(14, estimatedPoints % 100));
  const displayStyle = {
    "--cd-accent": themeStyle.accent,
    "--cd-accent-rgb": themeStyle.accentRgb,
    "--cd-border-start": themeStyle.borderStart,
    "--cd-border-end": themeStyle.borderEnd,
    "--cd-soft": themeStyle.soft,
    backgroundColor: "#f8fafc",
    backgroundImage: [
      "linear-gradient(120deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0.5) 32%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.44) 76%, rgba(255,255,255,0) 100%)",
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 1px, rgba(255,255,255,0) 1px 24px)",
      "linear-gradient(135deg, #eef2ff 0%, #dbeafe 15%, #ccfbf1 30%, #fef3c7 47%, #ffe4e6 64%, #ede9fe 82%, #e0f2fe 100%)",
    ].join(", "),
    backgroundBlendMode: "screen, overlay, normal",
    backgroundSize: "260% 260%, 44px 44px, 100% 100%",
    fontFamily: '"Times New Roman", Times, serif',
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen flex-col overflow-hidden text-[#111827]"
      style={displayStyle}
    >
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#d9dde5] bg-white px-6 2xl:h-[74px] 2xl:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="truncate text-[26px] font-bold uppercase leading-none text-[#1f2937] 2xl:text-[30px]">
            {storeName}
          </h1>
          <div className="inline-flex h-7 items-center gap-2 rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 text-[12px] font-bold uppercase text-[#2563eb] shadow-[0_3px_14px_rgba(37,99,235,0.18)]">
            <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
            Online
          </div>
        </div>

        <div className="flex h-full items-center gap-6 text-[14px] font-bold uppercase text-[#6b7280] 2xl:gap-8">
          <div className="flex h-full items-center gap-3 border-r border-[#d1d5db] pr-6 2xl:pr-8">
            <span className="flex h-5 w-5 items-end justify-center gap-1">
              <span className="h-3 w-2 rounded-sm bg-[#22c55e]" />
              <span className="h-4 w-2 rounded-sm bg-[#22c55e]" />
            </span>
            Terminal #1
          </div>
          <div className="flex h-full items-center border-b-2 border-[#1d4ed8] px-1 text-[24px] text-[#111827] 2xl:text-[28px]">
            Гүйлгээ
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-0 flex-col">
          <div className="mb-4 flex shrink-0 items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[14px] font-bold uppercase text-[#9ca3af]">
                Одоогийн худалдан авалт
              </p>
              <h2 className="mt-1 truncate text-[32px] font-bold leading-none text-[#1f2937] 2xl:text-[38px]">
                {hasItems ? "Авсан бараанууд" : "Бараа хүлээж байна"}
              </h2>
            </div>
            <div className="shrink-0 rounded-full bg-white/80 px-4 py-1.5 text-[15px] font-bold text-[#475569] shadow-[0_6px_20px_rgba(15,23,42,0.08)]">
              {lines.length} бараа
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden border border-transparent bg-white [background:linear-gradient(#fff,#fff)_padding-box,linear-gradient(90deg,var(--cd-border-start),var(--cd-border-end))_border-box]">
            {lines.length === 0 ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-10 text-center">
                <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#fff9c4] text-[#b77900]">
                  <ShoppingBag className="h-12 w-12" strokeWidth={2.4} />
                </div>
                <p className="text-[34px] font-bold leading-none text-[#1f2937] 2xl:text-[38px]">
                  Бараа нэмэгдэхийг хүлээж байна
                </p>
                <p className="mt-4 max-w-[390px] text-[18px] font-bold leading-7 text-[#9ca3af]">
                  Касс дээр бараа уншуулах үед таны худалдан авалтын мэдээлэл
                  энд шууд харагдана.
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-4 2xl:p-5">
                <div className="space-y-3">
                  {lines.map((line) => {
                    const isLatest = line.productId === latestProductId;
                    const hasDiscount = line.discountAmount > 0;
                    const lineTotal = getLineTotal(line);

                    return (
                      <article
                        key={line.productId}
                        className={`grid min-h-[90px] grid-cols-[72px_minmax(0,1fr)_82px_150px] items-center gap-4 rounded-lg border bg-white px-3 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${
                          isLatest
                            ? "border-[var(--cd-accent)]"
                            : "border-[#e5e7eb]"
                        }`}
                      >
                        <div className="h-[72px] w-[72px] overflow-hidden rounded-md border border-[#e5e7eb] bg-[var(--cd-soft)]">
                          {line.imageUrl ? (
                            <img
                              src={line.imageUrl}
                              alt={line.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[28px] font-bold uppercase text-[var(--cd-accent)]">
                              {line.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-[21px] font-bold leading-6 text-[#111827]">
                              {line.name}
                            </h3>
                            {isLatest && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(var(--cd-accent-rgb),0.1)] px-2 py-1 text-[11px] font-bold uppercase text-[var(--cd-accent)]">
                                <Sparkles className="h-3 w-3" />
                                Шинэ
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-[15px] font-bold text-[#6b7280]">
                            Нэгж үнэ: {formatMoney(line.unitPrice)}
                          </p>
                          {hasDiscount && (
                            <p className="mt-1 text-[13px] font-bold text-[#ef4444]">
                              Хямдрал -{formatMoney(line.discountAmount)}
                            </p>
                          )}
                        </div>

                        <div className="justify-self-center rounded-md bg-[#f3f4f6] px-4 py-2 text-center">
                          <p className="text-[11px] font-bold uppercase text-[#9ca3af]">
                            Тоо
                          </p>
                          <p className="text-[26px] font-bold leading-none text-[#111827]">
                            {line.qty}
                          </p>
                        </div>

                        <div className="min-w-0 text-right">
                          {hasDiscount && (
                            <p className="mb-1 truncate text-[13px] font-bold text-[#9ca3af] line-through">
                              {formatMoney(line.qty * line.unitPrice)}
                            </p>
                          )}
                          <p className="break-words text-[27px] font-bold leading-none text-[#111827]">
                            {formatMoney(lineTotal)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-6 overflow-hidden">
          <section className="shrink-0 rounded-[24px] bg-[linear-gradient(135deg,#ffcc18_0%,#ff8a00_48%,#ff3d3d_100%)] p-8 text-[#111827] 2xl:p-9">
            <div className="flex items-center gap-3 text-[14px] font-bold uppercase">
              <Star className="h-4 w-4 text-[#eab308]" fill="#eab308" />
              Лоялти хөтөлбөр
            </div>
            <h3 className="mt-6 text-[26px] font-bold leading-8 2xl:text-[30px]">
              Welcome!
              <br />
              Тавтай морилно уу!
            </h3>
            <p className="mt-5 max-w-[330px] text-[16px] font-bold leading-6">
              Энэ худалдан авалтаас ойролцоогоор{" "}
              {estimatedPoints.toLocaleString("mn-MN")} оноо цуглуулах
              боломжтой.
            </p>
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/85">
              <div
                className="h-full rounded-full bg-[#eab308]"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
            <p className="mt-6 text-[12px] font-bold uppercase">
              Дараагийн шат хүртэл худалдан авалтаа үргэлжлүүлэх боломж
            </p>
          </section>

          <section className="min-h-0 rounded-[24px] bg-white p-8 text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.08)] 2xl:p-9">
            <div className="space-y-4 text-[18px] font-bold text-[#6b7280]">
              <div className="flex items-center justify-between gap-6">
                <span>Нийт дүн</span>
                <span className="text-[#111827]">
                  {formatMoney(totals.subTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Хямдрал</span>
                <span className="text-[#111827]">-{formatMoney(savings)}</span>
              </div>
              <div className="flex items-center justify-between gap-6 border-b border-[#e5e7eb] pb-4">
                <span>НӨАТ</span>
                <span className="text-[#111827]">
                  {formatMoney(totals.taxTotal)}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-3 text-[19px] font-bold uppercase text-[#6b7280]">
                <ReceiptText className="h-5 w-5" />
                Төлөх дүн
              </div>
              <p className="mt-5 break-words text-[76px] font-bold leading-none text-[#111827] 2xl:text-[88px]">
                {formatMoney(totals.grandTotal)}
              </p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
