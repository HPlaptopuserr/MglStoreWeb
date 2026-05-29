"use client";

import type { CSSProperties } from "react";
import { Radio, ReceiptText, ShoppingBag, Sparkles, Star } from "lucide-react";
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
    rgb: string;
    lightRgb: string;
    deepRgb: string;
  }
> = {
  violet: {
    rgb: "139, 92, 246",
    lightRgb: "216, 180, 254",
    deepRgb: "34, 20, 59",
  },
  blue: {
    rgb: "6, 182, 212",
    lightRgb: "103, 232, 249",
    deepRgb: "12, 38, 55",
  },
  emerald: {
    rgb: "34, 197, 94",
    lightRgb: "134, 239, 172",
    deepRgb: "12, 48, 32",
  },
  amber: {
    rgb: "245, 158, 11",
    lightRgb: "253, 230, 138",
    deepRgb: "61, 34, 15",
  },
  rose: {
    rgb: "236, 72, 153",
    lightRgb: "249, 168, 212",
    deepRgb: "58, 18, 42",
  },
  white: {
    rgb: "248, 250, 252",
    lightRgb: "255, 255, 255",
    deepRgb: "36, 39, 50",
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
  theme = "violet",
}: Props) {
  const savings = Math.max(0, totals.discountTotal);
  const latestProductId = lines[lines.length - 1]?.productId;
  const hasItems = lines.length > 0;
  const estimatedPoints = Math.floor(Math.max(0, totals.grandTotal) / 100);
  const themeStyle = CUSTOMER_DISPLAY_THEME_STYLES[theme];
  const displayStyle = {
    "--cd-rgb": themeStyle.rgb,
    "--cd-light-rgb": themeStyle.lightRgb,
    "--cd-deep-rgb": themeStyle.deepRgb,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen flex-col overflow-hidden bg-[#0b0d14] text-[#f4efff]"
      style={displayStyle}
    >
      <header className="flex h-[90px] shrink-0 items-center justify-between border-b border-white/10 bg-[#0d1018]/95 px-12 shadow-[0_18px_60px_rgba(0,0,0,0.42)]">
        <div className="flex min-w-0 items-center gap-5">
          <h1 className="truncate text-4xl font-black uppercase tracking-tight text-[rgb(var(--cd-light-rgb))] drop-shadow-[0_0_18px_rgba(var(--cd-rgb),0.28)]">
            {storeName}
          </h1>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-white/80 shadow-inner">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.95)]" />
            Online
          </div>
        </div>

        <div className="flex items-center gap-8 text-sm font-black uppercase tracking-[0.12em] text-white/70">
          <div className="flex items-center gap-3 border-r border-white/15 pr-8">
            <Radio className="h-5 w-5 text-[rgb(var(--cd-light-rgb))]" />
            Terminal #1
          </div>
          <div className="flex items-center gap-7">
            <span className="border-b-4 border-[rgb(var(--cd-light-rgb))] pb-2 text-xl text-[#efe3ff]">
              Гүйлгээ
            </span>
          </div>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_500px]">
        <section className="relative flex min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_34%_6%,rgba(var(--cd-rgb),0.22),transparent_33%),linear-gradient(110deg,rgb(var(--cd-deep-rgb))_0%,#160b25_45%,#0b0d14_100%)] px-8 py-6">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

          <div className="relative z-10 mb-5 flex shrink-0 items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200/75">
                Одоогийн худалдан авалт
              </p>
              <h2 className="mt-2 font-serif text-3xl font-black leading-tight text-white md:text-[2.35rem]">
                {hasItems ? "Авсан бараанууд" : "Бараа хүлээж байна"}
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-base font-semibold text-white/75">
              {lines.length} бараа
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[rgba(var(--cd-rgb),0.5)] bg-[#121620]/70 p-10 text-center shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
              <div className="mb-7 flex h-24 w-24 items-center justify-center rounded-3xl border border-[rgba(var(--cd-rgb),0.4)] bg-[rgba(var(--cd-rgb),0.14)] text-[rgb(var(--cd-light-rgb))] shadow-[0_0_38px_rgba(var(--cd-rgb),0.26)]">
                <ShoppingBag className="h-12 w-12" />
              </div>
              <p className="text-4xl font-black text-white">
                Бараа нэмэгдэхийг хүлээж байна
              </p>
              <p className="mt-4 max-w-xl text-lg font-medium leading-8 text-white/55">
                Касс дээр бараа уншуулах үед таны худалдан авалтын мэдээлэл энд
                шууд харагдана.
              </p>
            </div>
          ) : (
            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto pr-3">
              <div className="space-y-2.5">
                {lines.map((line) => {
                  const isLatest = line.productId === latestProductId;
                  const hasDiscount = line.discountAmount > 0;
                  const lineTotal = getLineTotal(line);

                  return (
                    <article
                      key={line.productId}
                      className={`grid grid-cols-[72px_minmax(0,1fr)_78px_128px] items-center gap-4 rounded-lg border px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition ${
                        isLatest
                          ? "border-[rgb(var(--cd-light-rgb))] bg-[rgba(var(--cd-rgb),0.2)]"
                          : "border-white/10 bg-[#10141e]/70"
                      }`}
                    >
                      <div className="relative h-[72px] w-[72px] overflow-hidden rounded-md border border-white/10 bg-[#202637]">
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(var(--cd-rgb),0.36),#151a25)] text-2xl font-black text-[rgb(var(--cd-light-rgb))]">
                            {line.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="truncate text-lg font-black tracking-tight text-white md:text-xl">
                            {line.name}
                          </h3>
                          {isLatest && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgb(var(--cd-rgb))] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
                              <Sparkles className="h-2.5 w-2.5" />
                              Шинэ
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-white/65">
                          Нэгж үнэ: {formatMoney(line.unitPrice)}
                        </p>
                        {hasDiscount && (
                          <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide text-cyan-300">
                            Хямдрал -{formatMoney(line.discountAmount)}
                          </p>
                        )}
                      </div>

                      <div className="justify-self-center rounded-md border border-white/10 bg-[#0d1018] px-4 py-2 text-center shadow-inner">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">
                          Тоо
                        </p>
                        <p className="text-2xl font-black tabular-nums text-white">
                          {line.qty}
                        </p>
                      </div>

                      <div className="text-right">
                        {hasDiscount && (
                          <p className="mb-0.5 text-xs font-semibold tabular-nums text-white/40 line-through">
                            {formatMoney(line.qty * line.unitPrice)}
                          </p>
                        )}
                        <p
                          className={`break-words text-2xl font-black leading-none tabular-nums ${
                            hasDiscount
                              ? "text-cyan-300"
                              : "text-[rgb(var(--cd-light-rgb))]"
                          }`}
                        >
                          {formatMoney(lineTotal)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[linear-gradient(180deg,#252833_0%,#141c24_100%)] px-10 py-10">
          <div className="rounded-2xl border border-[rgba(var(--cd-rgb),0.7)] bg-[rgba(var(--cd-rgb),0.22)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.12em] text-white/72">
              <Star className="h-6 w-6 text-[rgb(var(--cd-light-rgb))]" />
              Лоялти хөтөлбөр
            </div>
            <h3 className="mt-7 font-serif text-2xl font-black text-white">
              Тавтай морилно уу!
            </h3>
            <p className="mt-3 text-lg font-medium leading-7 text-white/68">
              Энэ худалдан авалтаас ойролцоогоор{" "}
              <span className="font-black text-white">
                {estimatedPoints.toLocaleString("mn-MN")}
              </span>{" "}
              оноо цуглуулах боломжтой.
            </p>
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[rgb(var(--cd-rgb))]"
                style={{
                  width: `${Math.min(100, Math.max(12, estimatedPoints % 100))}%`,
                }}
              />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/55">
              Дараагийн шат хүртэл худалдан авалтаа үргэлжлүүлээрэй
            </p>
          </div>

          <div className="mt-10 space-y-6 text-xl font-medium text-white/78">
            <div className="flex items-center justify-between gap-6">
              <span>Нийт дүн</span>
              <span className="font-semibold tabular-nums text-white">
                {formatMoney(totals.subTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span>Хямдрал</span>
              <span className="font-semibold tabular-nums text-cyan-300">
                -{formatMoney(savings)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-6">
              <span>НӨАТ</span>
              <span className="font-semibold tabular-nums text-white">
                {formatMoney(totals.taxTotal)}
              </span>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3 text-lg font-black uppercase tracking-[0.12em] text-white/78">
              <ReceiptText className="h-5 w-5 text-[rgb(var(--cd-light-rgb))]" />
              Төлөх дүн
            </div>
            <p className="mt-5 break-words text-7xl font-black leading-none tracking-tight text-[rgb(var(--cd-light-rgb))] tabular-nums drop-shadow-[0_0_28px_rgba(var(--cd-rgb),0.22)]">
              {formatMoney(totals.grandTotal)}
            </p>
          </div>
        </aside>
      </main>

      <footer className="flex h-[58px] shrink-0 items-center justify-between border-t border-white/10 bg-[#0d1018] px-12 text-sm font-semibold text-white/65">
        <span>© 2026 MGL STORE</span>
        <span className="italic">
          Баярлалаа. Таны худалдан авалт амжилттай үргэлжилж байна.
        </span>
        <span>Тусламж · Нөхцөл</span>
      </footer>
    </div>
  );
}
