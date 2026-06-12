import { Package, Trophy } from "lucide-react";
import type { StatisticsInsights } from "@/lib/statistics-api";
import { money } from "./statistics-format";

type Product = StatisticsInsights["topProducts"][number];

export function TopProductsList({
  products,
  visibleCount,
}: {
  products: Product[];
  visibleCount: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Trophy className="h-5 w-5 text-amber-500" />
            Хамгийн их зарагдаж буй бараа
          </h3>
          <p className="text-sm font-medium text-slate-500">
            Тоо, орлого, transaction болон үлдэгдлээр харуулна.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {products.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
            Хайлтад тохирох бараа олдсонгүй.
          </p>
        )}
        {products.slice(0, visibleCount).map((item, index) => (
          <article key={item.productId} className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
                {index + 1}
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-slate-950">{item.name}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {item.organizationName || "Байгууллагагүй"} {item.sku ? `· SKU ${item.sku}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-left md:text-right">
                    <p className="text-base font-black text-slate-950">{item.units.toLocaleString("mn-MN")} ш</p>
                    <p className="text-sm font-black text-emerald-600">{money(item.revenue)}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                  <Metric label="Transaction" value={item.transactions.toLocaleString("mn-MN")} />
                  <Metric label="Үлдэгдэл" value={`${item.stock.toLocaleString("mn-MN")} ш`} />
                  <Metric label="Velocity" value={item.velocityScore.toLocaleString("mn-MN")} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
