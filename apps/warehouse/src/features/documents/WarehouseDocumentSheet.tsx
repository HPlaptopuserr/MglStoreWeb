import type { ReactNode } from "react";

export type WarehouseDocumentItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
};

export function WarehouseDocumentSheet({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      className={`rounded-lg border border-slate-200 bg-white p-6 text-slate-900 print:border-0 print:p-0 ${className}`}
    >
      {children}
    </article>
  );
}

export function WarehouseDocumentHeader({
  title,
  number,
  date,
  status,
  titleId,
}: {
  title: string;
  number: string;
  date: Date;
  status?: string;
  titleId?: string;
}) {
  return (
    <header className="header mb-5 border-b-2 border-double border-slate-300 pb-4 text-center">
      <h1 id={titleId} className="text-2xl font-bold text-slate-800">
        {title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {number} •{" "}
        {date.toLocaleDateString("mn-MN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      {status && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {status}
        </p>
      )}
    </header>
  );
}

export function WarehouseDocumentInfoGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="info-grid mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
    </section>
  );
}

export function WarehouseDocumentInfoCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="info-box rounded-lg border border-slate-200 p-3">
      <p className="label text-[11px] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="value mt-1 text-sm font-semibold text-slate-800">{value}</p>
      {children}
    </div>
  );
}

export function WarehouseDocumentItemsTable({
  items,
  codeMode = "BOTH",
}: {
  items: WarehouseDocumentItem[];
  codeMode?: "SKU" | "BARCODE" | "BOTH";
}) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const codeHeading =
    codeMode === "SKU"
      ? "SKU"
      : codeMode === "BARCODE"
        ? "Баркод"
        : "SKU / баркод";

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[720px] border-collapse text-sm print:min-w-0">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-3 py-2 text-left">№</th>
            <th className="border border-slate-300 px-3 py-2 text-left">
              Бүтээгдэхүүний нэр
            </th>
            <th className="border border-slate-300 px-3 py-2 text-left">
              {codeHeading}
            </th>
            <th className="border border-slate-300 px-3 py-2 text-right">
              Тоо ширхэг
            </th>
            <th className="border border-slate-300 px-3 py-2 text-right">
              Нэгж үнэ
            </th>
            <th className="border border-slate-300 px-3 py-2 text-right">
              Нийт дүн
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <td className="border border-slate-300 px-3 py-2">{index + 1}</td>
              <td className="border border-slate-300 px-3 py-2 font-medium">
                {item.name}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-slate-500">
                {codeMode === "SKU"
                  ? item.sku || "—"
                  : codeMode === "BARCODE"
                    ? item.barcode || item.sku || "—"
                    : `${item.sku || "—"} / ${item.barcode || "—"}`}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold tabular-nums">
                {item.quantity.toLocaleString()} {item.unit || ""}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right tabular-nums">
                ₮{item.unitPrice.toLocaleString()}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-medium tabular-nums">
                ₮{(item.quantity * item.unitPrice).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row bg-slate-50 font-bold">
            <td
              colSpan={3}
              className="border border-slate-300 px-3 py-2 text-right"
            >
              Нийт:
            </td>
            <td className="border border-slate-300 px-3 py-2 text-right tabular-nums">
              {totalQuantity.toLocaleString()}
            </td>
            <td className="border border-slate-300 px-3 py-2" />
            <td className="border border-slate-300 px-3 py-2 text-right tabular-nums">
              ₮{totalAmount.toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
