import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { PaymentDisplayStatus } from "../types/payment-status.types";

const STATUSES = {
  success: {
    label: "Амжилттай",
    Icon: CheckCircle2,
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Амжилтгүй",
    Icon: XCircle,
    color: "border-rose-200 bg-rose-50 text-rose-700",
  },
  pending: {
    label: "Хүлээгдэж байна",
    Icon: Loader2,
    color: "border-blue-200 bg-blue-50 text-blue-700",
  },
  unknown: {
    label: "Төлөв тодорхойгүй",
    Icon: AlertTriangle,
    color: "border-amber-200 bg-amber-50 text-amber-800",
  },
  unpaid: {
    label: "Төлөгдөөгүй",
    Icon: Circle,
    color: "border-slate-200 bg-slate-50 text-slate-500",
  },
  unused: {
    label: "Төлөхгүй",
    Icon: MinusCircle,
    color: "border-slate-200 bg-slate-50 text-slate-400",
  },
} as const;

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentDisplayStatus;
}) {
  const { label, Icon, color } = STATUSES[status];
  return (
    <span
      role="status"
      className={`inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${color}`}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={
          status === "pending"
            ? "animate-spin motion-reduce:animate-none"
            : undefined
        }
      />
      {label}
    </span>
  );
}
