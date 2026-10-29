import type { WarehouseInvestorReport } from "@mgl/types";
import { money } from "./InvestorMetrics";

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
      <span>
        {total} бичлэг · {page} / {pages}
      </span>
      <div className="flex gap-2">
        {[
          { label: "Өмнөх", next: page - 1, disabled: page <= 1 },
          { label: "Дараах", next: page + 1, disabled: page >= pages },
        ].map((item) => (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={() => onChange(item.next)}
            className="rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
const cell = "whitespace-nowrap px-5 py-4 text-left";
export function InvestorTables({
  data,
  productPage,
  salesPage,
  onProductPage,
  onSalesPage,
}: {
  data: WarehouseInvestorReport;
  productPage: number;
  salesPage: number;
  onProductPage: (page: number) => void;
  onSalesPage: (page: number) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-bold">Одоогийн бүтээгдэхүүнүүд</h2>
          <p className="mt-1 text-xs text-slate-500">
            Сонгосон огнооноос үл хамаарах одоогийн үлдэгдэл
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Дэлгүүрийн барааны үлдэгдэл, үнэ, өртөг
            </caption>
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "Бараа",
                  "Үлдэгдэл",
                  "Нэгжийн үнэ",
                  "Нэгжийн өртөг",
                  "Үлдэгдлийн өртөг",
                ].map((label) => (
                  <th key={label} scope="col" className={cell}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.products.items.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-blue-50/40"
                >
                  <td className={cell}>
                    <p className="max-w-sm whitespace-normal font-medium">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.sku || "SKU байхгүй"}
                    </p>
                  </td>
                  <td className={cell}>
                    {product.quantity.toLocaleString("mn-MN", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {product.unit || "ш"}
                  </td>
                  <td className={cell}>{money(product.price)}</td>
                  <td className={cell}>{money(product.costPrice)}</td>
                  <td className={cell}>{money(product.stockCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.products.items.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            Бүртгэлтэй бүтээгдэхүүн алга.
          </p>
        )}
        <Pagination
          page={productPage}
          total={data.products.total}
          onChange={onProductPage}
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-bold">Борлуулалтын түүх</h2>
          <p className="mt-1 text-xs text-slate-500">
            Бүрэн төлөгдсөн онлайн болон дэлгүүрүүдэд нийлүүлсэн захиалгууд
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Төлөгдсөн борлуулалт, өртөг, нийт ашгийн түүх
            </caption>
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "Огноо / Захиалга",
                  "Бүтээгдэхүүн",
                  "Борлуулалт",
                  "Өртөг",
                  "Нийт ашиг",
                ].map((label) => (
                  <th key={label} scope="col" className={cell}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.history.items.map((sale) => (
                <tr
                  key={`${sale.channel}-${sale.id}`}
                  className="transition-colors hover:bg-blue-50/40"
                >
                  <td className={cell}>
                    <p className="font-medium">{sale.number}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(sale.paidAt).toLocaleString("mn-MN", {
                        timeZone: "Asia/Ulaanbaatar",
                      })}
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">
                      {sale.channel === "RETAIL" ? "Онлайн" : "Нийлүүлэлт"}
                    </span>
                  </td>
                  <td
                    className={`${cell} max-w-sm !whitespace-normal text-slate-600`}
                  >
                    {sale.products}
                  </td>
                  <td className={cell}>{money(sale.revenue)}</td>
                  <td className={cell}>{money(sale.cost)}</td>
                  <td
                    className={`${cell} font-semibold ${sale.grossProfit !== null && sale.grossProfit < 0 ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {money(sale.grossProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.history.items.length && (
          <p className="p-10 text-center text-sm text-slate-500">
            Сонгосон хугацаанд төлөгдсөн борлуулалт алга.
          </p>
        )}
        <Pagination
          page={salesPage}
          total={data.history.total}
          onChange={onSalesPage}
        />
      </section>
    </div>
  );
}
