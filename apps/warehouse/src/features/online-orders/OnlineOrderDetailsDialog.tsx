"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, PackageCheck, Truck, X } from "lucide-react";
import type { OnlineOrder } from "./online-order.types";
import { ONLINE_ORDER_ACTION } from "./online-order.config";
import { OrderItemsSection } from "./OrderItemsSection";
import { OrderPaymentSummary } from "./OrderPaymentSummary";
import { OrderRouteSection } from "./OrderRouteSection";

interface OnlineOrderDetailsDialogProps {
  order: OnlineOrder;
  busy: boolean;
  onClose: () => void;
  onAdvance: (order: OnlineOrder) => void;
  onAssignDelivery: (order: OnlineOrder) => void;
}

export function OnlineOrderDetailsDialog({
  order,
  busy,
  onClose,
  onAdvance,
  onAssignDelivery,
}: OnlineOrderDetailsDialogProps) {
  const actionLabel = ONLINE_ORDER_ACTION[order.status];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`order-dialog-${order.id}`}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              Захиалгын дэлгэрэнгүй
            </p>
            <h2
              id={`order-dialog-${order.id}`}
              className="mt-1 truncate font-mono text-base font-black text-slate-950"
            >
              {order.orderNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Дэлгэрэнгүй хаах"
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <OrderItemsSection items={order.items} />
            <OrderRouteSection order={order} />
          </div>

          <div className="mt-4">
            <OrderPaymentSummary order={order} />
          </div>

          {order.delivery && (
            <div className="mt-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold text-indigo-800">
              <div className="flex flex-wrap items-center gap-3">
                <PackageCheck size={16} />
                <span>{order.delivery.packageCount} багц</span>
                {order.delivery.totalWeightKg && (
                  <span>· {order.delivery.totalWeightKg} кг</span>
                )}
                {order.delivery.sizeCategory && (
                  <span>· {order.delivery.sizeCategory}</span>
                )}
                {order.delivery.isFragile && <span>· Эмзэг бараа</span>}
              </div>
            </div>
          )}
        </div>

        {(actionLabel || order.status === "SHIPPING") && (
          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            {actionLabel ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onAdvance(order);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {order.status === "PREPARED" ? (
                  <Truck size={17} />
                ) : (
                  <PackageCheck size={17} />
                )}
                {busy ? "Түр хүлээнэ үү..." : actionLabel}
                {!busy && <ChevronRight size={16} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAssignDelivery(order);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <Truck size={17} />
                {order.delivery?.courier
                  ? "Хуваарилалт өөрчлөх"
                  : "Компани ба хүргэгч хуваарилах"}
              </button>
            )}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
