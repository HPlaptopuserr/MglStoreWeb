import type { OnlineOrderStatus } from "./online-order.types";
import { ONLINE_ORDER_STATUS } from "./online-order.config";

export function OrderStatusBadge({ status }: { status: OnlineOrderStatus }) {
  const config = ONLINE_ORDER_STATUS[status] || {
    label: status || "Төлөвгүй",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
