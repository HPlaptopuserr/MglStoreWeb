import type { LucideIcon } from "lucide-react";
import { Boxes, CircleDollarSign, Package, TrendingUp } from "lucide-react";
import { formatReportStock } from "./product-report";
import type { ProductReportTotals } from "./product-report";

const money = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")} ₮`;

export function ProductReportSummary({
  totals,
}: {
  totals: ProductReportTotals;
}) {
  const cards: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    tone: string;
    accent: string;
    hint: string;
  }> = [
    {
      label: "Бүтээгдэхүүн",
      value: String(totals.productCount),
      icon: Package,
      tone: "bg-indigo-50 text-indigo-600",
      accent: "before:bg-indigo-500",
      hint: "Шүүлтүүрт тохирсон",
    },
    {
      label: "Нийт үлдэгдэл",
      value: formatReportStock(totals),
      icon: Boxes,
      tone: "bg-sky-50 text-sky-600",
      accent: "before:bg-sky-500",
      hint: "Нэгж тус бүрээр",
    },
    {
      label: "Нөөцийн өртөг",
      value: money(totals.inventoryCost),
      icon: CircleDollarSign,
      tone: "bg-amber-50 text-amber-600",
      accent: "before:bg-amber-500",
      hint: "Авсан үнээр",
    },
    {
      label: "Боломжит ашиг",
      value: money(totals.projectedGrossProfit),
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-600",
      accent: "before:bg-emerald-500",
      hint: "Өртөг бүртгэлтэй бараа",
    },
  ];

  return (
    <div className="space-y-3">
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Тайлангийн хураангуй"
      >
        {cards.map(({ label, value, icon: Icon, tone, accent, hint }) => (
          <article
            key={label}
            className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1 hover:-translate-y-0.5 hover:shadow-md ${accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
              >
                <Icon size={19} />
              </div>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                {hint}
              </span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 break-words text-xl font-black text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </section>
      {(totals.missingCostCount > 0 || totals.negativeStockCount > 0) && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
        >
          {totals.missingCostCount > 0 &&
            `${totals.missingCostCount} барааны авсан үнэ бүртгэлгүй тул өртөг, ашгийн тооцоо дутуу байна. `}
          {totals.negativeStockCount > 0 &&
            `${totals.negativeStockCount} бараа сөрөг үлдэгдэлтэй. Нөөцийн үнэлгээнд эерэг үлдэгдлийг тооцсон.`}
        </p>
      )}
    </div>
  );
}
