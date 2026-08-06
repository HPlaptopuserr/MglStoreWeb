import { CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";

export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

export type RequestDecision = "approve" | "reject";
export type StatusFilter = RequestStatus | "ALL";

export interface RequestItem {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  product: { id: string; name: string; sku: string | null };
}

export interface StockRequest {
  id: string;
  requestNumber: string;
  status: RequestStatus;
  requestedAt: string;
  note: string | null;
  reviewNote: string | null;
  organization: { id: string; name: string };
  warehouse: { id: string; name: string };
  items: RequestItem[];
}

export const VISIBLE_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
] as const satisfies readonly RequestStatus[];

export const REQUEST_STATUS_CONFIG = {
  PENDING: { label: "Хүлээгдэж буй", icon: Clock, tone: "amber" },
  APPROVED: { label: "Зөвшөөрөгдсөн", icon: CheckCircle2, tone: "emerald" },
  PROCESSING: { label: "Боловсруулж буй", icon: Truck, tone: "blue" },
  COMPLETED: { label: "Дууссан", icon: Package, tone: "slate" },
  REJECTED: { label: "Татгалзсан", icon: XCircle, tone: "red" },
  CANCELLED: { label: "Цуцлагдсан", icon: XCircle, tone: "slate" },
} satisfies Record<
  RequestStatus,
  { label: string; icon: typeof Clock; tone: RequestTone }
>;

type RequestTone = "amber" | "emerald" | "blue" | "red" | "slate";

export const REQUEST_TONE_CLASS: Record<RequestTone, string> = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

export function countRequestsByStatus(requests: StockRequest[]) {
  const counts: Record<RequestStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };
  for (const request of requests) counts[request.status] += 1;
  return counts;
}

export function initialApprovedQuantities(request: StockRequest) {
  return Object.fromEntries(
    request.items.map((item) => [
      item.id,
      item.approvedQuantity ?? item.quantity,
    ]),
  );
}
