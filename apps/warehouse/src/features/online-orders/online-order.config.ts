import type { OnlineOrderStatus } from "./online-order.types";

export const ONLINE_ORDER_STATUS: Record<
  OnlineOrderStatus,
  { label: string; className: string }
> = {
  CONFIRMED: {
    label: "Шинэ",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  PREPARING: {
    label: "Бэлтгэж байна",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  PREPARED: {
    label: "Бэлтгэгдсэн",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  SHIPPING: {
    label: "Хүргэлтэд",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  COMPLETED: {
    label: "Дууссан",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CANCELLED: {
    label: "Цуцалсан",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

export const ONLINE_ORDER_ACTION: Partial<
  Record<OnlineOrderStatus, string>
> = {
  CONFIRMED: "Бэлтгэж эхлэх",
  PREPARING: "Бэлтгэж дуусгах",
  PREPARED: "Багц баталж хүргэлтэд шилжүүлэх",
};

export function formatPaymentMethod(method: string | null): string {
  if (!method) return "Төлбөрийн суваг бүртгэгдээгүй";
  const labels: Record<string, string> = {
    QPAY: "QPay",
    CASH: "Бэлэн мөнгө",
    CARD: "Карт",
    BANK_TRANSFER: "Банкны шилжүүлэг",
    WALLET: "Цахим хэтэвч",
  };
  return labels[method] || method;
}
