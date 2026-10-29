import type { WarehouseInvestorReport } from "@mgl/types";
import { Package, Wallet, TrendingUp, ShoppingBag } from "lucide-react";
export const money = (value: number | null) =>
  value === null
    ? "Өртөг дутуу"
    : `${value.toLocaleString("mn-MN", { maximumFractionDigits: 2 })} ₮`;

export function InvestorMetrics({ data }: { data: WarehouseInvestorReport }) {
  const cards = [
    {
      label: "Барааны төрөл",
      value: data.inventory.productCount.toLocaleString("mn-MN"),
      detail: `${data.inventory.inStockCount} төрөл үлдэгдэлтэй`,
      icon: Package,
    },
    {
      label: "Үлдэгдлийн өртөг",
      value: money(data.inventory.stockCost),
      detail: `Борлуулах дүн ${money(data.inventory.stockValue)}`,
      icon: Wallet,
    },
    {
      label: "Төлөгдсөн борлуулалт",
      value: money(data.sales.revenue),
      detail: `${data.sales.orderCount} захиалга · Сонгосон хугацаанд`,
      icon: ShoppingBag,
    },
    {
      label: "Борлуулалтын нийт ашиг",
      value: money(data.sales.grossProfit),
      detail: `Борлуулсан барааны өртөг ${money(data.sales.cost)}`,
      icon: TrendingUp,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <article
          key={label}
          className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">
              {label}
            </p>
            <Icon className="size-4 shrink-0 text-blue-500 sm:size-5" />
          </div>
          <p className="mt-3 break-words text-xl sm:text-2xl font-bold tracking-tight">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] leading-5 sm:text-xs text-slate-500">
            {detail}
          </p>
        </article>
      ))}
    </div>
  );
}
