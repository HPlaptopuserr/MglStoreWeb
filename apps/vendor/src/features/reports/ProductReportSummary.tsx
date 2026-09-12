import type { LucideIcon } from "lucide-react";
import { Boxes, CircleDollarSign, Package, TrendingUp } from "lucide-react";
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
  }> = [
    {
      label: "Бүтээгдэхүүн",
      value: String(totals.productCount),
      icon: Package,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Нийт үлдэгдэл",
      value: totals.stockQuantity.toLocaleString("mn-MN"),
      icon: Boxes,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "Нөөцийн өртөг",
      value: money(totals.inventoryCost),
      icon: CircleDollarSign,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Боломжит нийт ашиг",
      value: money(totals.projectedGrossProfit),
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Тайлангийн хураангуй"
    >
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div
            className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tone}`}
          >
            <Icon size={19} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-words text-xl font-black text-slate-900">
            {value}
          </p>
        </article>
      ))}
    </section>
  );
}
