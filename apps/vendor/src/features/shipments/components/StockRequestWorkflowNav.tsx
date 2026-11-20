"use client";

import { Clock, CreditCard, Package } from "lucide-react";
import type { StockRequestSection } from "../types/stock-request.types";

interface StockRequestWorkflowNavProps {
  active: StockRequestSection;
  pendingRequestCount: number;
  outstandingPaymentCount: number;
  onNavigate: (section: StockRequestSection) => void;
}

export function StockRequestWorkflowNav({
  active,
  pendingRequestCount,
  outstandingPaymentCount,
  onNavigate,
}: StockRequestWorkflowNavProps) {
  const items = [
    {
      key: "new" as const,
      label: "Агуулахын бараа",
      description: "Бараа сонгох, захиалах",
      icon: Package,
      count: 0,
      warning: false,
    },
    {
      key: "requests" as const,
      label: "Захиалгын түүх",
      description: "Хүсэлтийн явц, хүргэлт",
      icon: Clock,
      count: pendingRequestCount,
      warning: false,
    },
    {
      key: "payments" as const,
      label: "Төлбөрийн түүх",
      description: "Нэхэмжлэх, үлдэгдэл",
      icon: CreditCard,
      count: outstandingPaymentCount,
      warning: outstandingPaymentCount > 0,
    },
  ];

  return (
    <nav
      aria-label="Бараа таталтын үндсэн хэсгүүд"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
            className={`relative flex min-h-14 items-center justify-center gap-2 rounded-xl px-2 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:justify-start sm:gap-3 sm:px-4 ${
              isActive
                ? "bg-amber-50 text-slate-950 ring-1 ring-inset ring-amber-200/70"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex ${
                isActive
                  ? "bg-amber-100 text-amber-700"
                  : item.warning
                    ? "bg-rose-50 text-rose-600"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-center text-xs font-semibold leading-5 sm:text-left sm:text-sm">
                {item.label}
              </span>
              <span className="mt-0.5 hidden text-xs leading-4 text-slate-500 md:block">
                {item.description}
              </span>
            </span>
            {item.count > 0 && (
              <span
                aria-label={`${item.count} ${item.key === "payments" ? "төлбөрийн үлдэгдэл" : "хүлээгдэж буй хүсэлт"}`}
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums sm:ml-auto sm:px-2 sm:text-xs ${
                  item.warning
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
