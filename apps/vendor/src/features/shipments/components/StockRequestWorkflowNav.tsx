"use client";

import { Clock, CreditCard, Package } from "lucide-react";
import type { StockRequestSection } from "../types/stock-request.types";
interface StockRequestWorkflowNavProps {
  active: StockRequestSection;
  pendingRequestCount: number;
  outstandingPaymentCount: number;
  isNewOrderLocked: boolean;
  onNavigate: (section: StockRequestSection) => void;
}

export function StockRequestWorkflowNav({
  active,
  pendingRequestCount,
  outstandingPaymentCount,
  isNewOrderLocked,
  onNavigate,
}: StockRequestWorkflowNavProps) {
  const items = [
    {
      key: "new" as const,
      label: "Шинэ захиалга",
      description: isNewOrderLocked ? "Төлбөр хүлээгдэж байна" : "Бараа сонгох",
      icon: Package,
      count: 0,
      warning: isNewOrderLocked,
    },
    {
      key: "requests" as const,
      label: "Захиалгын түүх",
      description: "Явц, хүргэлт",
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
      className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
            className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFAD02] focus-visible:ring-offset-2 ${
              isActive
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isActive
                  ? "bg-white/10 text-[#FFAD02]"
                  : item.warning
                    ? "bg-red-50 text-red-600"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-wider opacity-60">
                Алхам {index + 1}
              </span>
              <span className="block truncate text-sm font-bold">
                {item.label}
              </span>
              <span className="block truncate text-xs opacity-60">
                {item.description}
              </span>
            </span>
            {item.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-black ${
                  item.warning
                    ? "bg-red-100 text-red-700"
                    : isActive
                      ? "bg-white/10 text-white"
                      : "bg-amber-100 text-amber-700"
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
