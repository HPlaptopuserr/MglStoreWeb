import { CheckCircle, Clock, Truck, XCircle } from "lucide-react";
import type { StockRequestStatus } from "./types/stock-request.types";

export const WAREHOUSE_PRODUCTS_PAGE_SIZE = 30;

export const DELIVERY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const DELIVERY_DOCUMENT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const IS_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";

export const STOCK_REQUEST_STATUS: Record<
  StockRequestStatus,
  { label: string; color: string; icon: typeof Clock; bgColor: string }
> = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-600",
    icon: Clock,
    bgColor: "bg-amber-50",
  },
  APPROVED: {
    label: "Зөвшөөрөгдсөн",
    color: "text-green-600",
    icon: CheckCircle,
    bgColor: "bg-green-50",
  },
  REJECTED: {
    label: "Татгалзсан",
    color: "text-red-600",
    icon: XCircle,
    bgColor: "bg-red-50",
  },
  PROCESSING: {
    label: "Боловсруулж буй",
    color: "text-blue-600",
    icon: Truck,
    bgColor: "bg-blue-50",
  },
  COMPLETED: {
    label: "Дууссан",
    color: "text-slate-600",
    icon: CheckCircle,
    bgColor: "bg-slate-100",
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-slate-400",
    icon: XCircle,
    bgColor: "bg-slate-50",
  },
};
