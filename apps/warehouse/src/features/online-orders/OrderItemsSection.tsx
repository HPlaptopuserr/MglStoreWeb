import { Box } from "lucide-react";
import type { OnlineOrderItem } from "./online-order.types";

export function OrderItemsSection({ items }: { items: OnlineOrderItem[] }) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Box size={17} className="text-blue-600" />
          Барааны мэдээлэл
        </h3>
        <span className="text-xs font-semibold text-slate-500">
          {itemCount} ширхэг
        </span>
      </div>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 transition hover:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {item.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {item.sku ? `SKU: ${item.sku}` : "SKU бүртгэлгүй"}
                {item.barcode ? ` · Barcode: ${item.barcode}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-slate-900">
                {item.quantity} {item.unit || "ш"}
              </p>
              <p className="text-xs tabular-nums text-slate-500">
                ₮{item.subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
