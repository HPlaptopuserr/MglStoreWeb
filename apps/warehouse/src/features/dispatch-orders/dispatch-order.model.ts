import type { ElementType } from "react";
import { CheckCircle2, Clock, Truck, XCircle } from "lucide-react";

/* ───── types ───── */
export type WarehousePaymentAccount = {
  id: string;
  label: string;
  merchantName: string;
  merchantCode: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  registerNumber?: string;
  accountHolder: string;
};

export type DispatchItem = {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode?: string | null;
    price: number;
    images?: { url: string }[];
  };
};

export type Dispatch = {
  id: string;
  dispatchNumber: string;
  status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  note: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  request: {
    id: string;
    requestNumber: string;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    note: string | null;
    items: DispatchItem[];
    organization: { id: string; name: string; slug?: string };
    requestedBy: {
      id: string;
      email: string;
      profile?: { fullName: string; phoneNumber?: string };
    } | null;
    payment?: {
      id?: string;
      invoiceNumber: string;
      totalAmount: string | number;
      paidAmount: string | number;
      status: string;
      paymentMethod?: string | null;
      paidAt?: string | null;
      dueDate?: string | null;
      createdAt?: string;
      confirmedAt?: string | null;
      transactionId?: string | null;
      note?: string | null;
    } | null;
  };
  warehouse: { id: string; name: string; address?: string; phone?: string };
  organization: { id: string; name: string; phone?: string };
  driver?: {
    id: string;
    email: string;
    profile?: { fullName: string; phoneNumber?: string };
  } | null;
};

export type ReturnItem = {
  id: string;
  productId: string;
  quantity: number;
  reason: string | null;
  product: { id: string; name: string; sku: string | null; price: number };
};

export type DispatchReturnType = {
  id: string;
  returnNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  note: string | null;
  rejectReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  items: ReturnItem[];
  dispatch: {
    dispatchNumber: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    request: {
      requestNumber: string;
      deliveryAddress: string | null;
      organization: { id: string; name: string; phone: string | null };
      requestedBy: {
        id: string;
        email: string;
        profile?: { fullName: string; phoneNumber?: string };
      } | null;
    };
  };
  organization: { id: string; name: string; phone: string | null };
  warehouse: { id: string; name: string };
  approvedBy: {
    id: string;
    email: string;
    profile?: { fullName: string };
  } | null;
};

export type WarehouseOption = { id: string; name: string };

export const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: ElementType }
> = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Баталгаажсан",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  DISPATCHED: {
    label: "Илгээгдсэн",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
  },
  DELIVERED: {
    label: "Хүргэгдсэн",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

export const STEPS = [
  { key: "PENDING", label: "Хүлээгдэж буй", color: "amber", icon: Clock },
  {
    key: "CONFIRMED",
    label: "Баталгаажсан",
    color: "blue",
    icon: CheckCircle2,
  },
  { key: "DISPATCHED", label: "Илгээгдсэн", color: "purple", icon: Truck },
  { key: "DELIVERED", label: "Хүргэгдсэн", color: "green", icon: CheckCircle2 },
] as const;

export function stepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export function formatMoney(value: string | number | null | undefined) {
  return `₮${Number(value || 0).toLocaleString()}`;
}

export function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "PAID":
      return "Төлсөн";
    case "PENDING":
      return "Төлөөгүй";
    case "FAILED":
      return "Амжилтгүй";
    case "REFUNDED":
      return "Буцаасан";
    case "CANCELLED":
      return "Цуцлагдсан";
    default:
      return status || "-";
  }
}

export function paymentStatusClass(status?: string | null) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "FAILED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    case "REFUNDED":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export function paymentOutstanding(
  payment: NonNullable<Dispatch["request"]["payment"]>,
) {
  return Math.max(
    0,
    Number(payment.totalAmount || 0) - Number(payment.paidAmount || 0),
  );
}


