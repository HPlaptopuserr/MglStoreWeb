"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock3,
  Package,
} from "lucide-react";
import type { OnlineOrder } from "./online-order.types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OnlineOrderDetailsDialog } from "./OnlineOrderDetailsDialog";

interface OnlineOrderCardProps {
  order: OnlineOrder;
  busy: boolean;
  onAdvance: (order: OnlineOrder) => void;
  onAssignDelivery: (order: OnlineOrder) => void;
}

export function OnlineOrderCard({
  order,
  busy,
  onAdvance,
  onAssignDelivery,
}: OnlineOrderCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const courierName =
    order.delivery?.courier?.profile?.fullName ||
    order.delivery?.courier?.email;
  const isNew = order.status === "CONFIRMED";

  return (
    <article
      className={`relative overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md ${
        isNew
          ? "border-blue-300 bg-blue-50/70 ring-2 ring-blue-100 hover:border-blue-400"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {isNew && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-400"
        />
      )}
      <header
        className={`flex flex-col gap-3 p-4 pl-5 lg:flex-row lg:items-center lg:justify-between ${
          isNew ? "bg-blue-50/70" : "bg-white"
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isNew && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
              </span>
            )}
            <h2 className="font-mono text-sm font-black text-slate-950">
              {order.orderNumber}
            </h2>
            <OrderStatusBadge status={order.status} />
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Төлөгдсөн
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} />
              {new Date(order.createdAt).toLocaleString("mn-MN")}
            </span>
            <span className="flex items-center gap-1.5">
              <Package size={13} />
              {itemCount} ширхэг · {order.items.length} төрөл
            </span>
            {order.delivery?.providerOrganization && (
              <span className="truncate">
                {order.delivery.providerOrganization.name}
                {courierName ? ` · ${courierName}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 lg:justify-end">
          <p className="text-base font-black tabular-nums text-slate-950">
            ₮{order.total.toLocaleString()}
          </p>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-haspopup="dialog"
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${
              isNew
                ? "border-blue-300 bg-blue-600 text-white hover:bg-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            Дэлгэрэнгүй
            <ChevronDown size={15} />
          </button>
        </div>
      </header>

      {detailsOpen && (
        <OnlineOrderDetailsDialog
          order={order}
          busy={busy}
          onClose={() => setDetailsOpen(false)}
          onAdvance={onAdvance}
          onAssignDelivery={onAssignDelivery}
        />
      )}
    </article>
  );
}
