export type WarehouseDetail = {
  id: string;
  name: string;
  address: string;
  capacity: number;
  summary?: {
    totalProducts: number;
    totalQuantity: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  inventories?: {
    id: string;
    quantity: number;
    minQuantity: number;
    product: {
      id: string;
      name: string;
      sku: string | null;
      price: string;
    };
  }[];
};

export type Movement = {
  id: string;
  change: number;
  reason: string;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null };
  createdBy?: {
    id: string;
    email: string;
    profile?: { fullName: string | null } | null;
  } | null;
};

export type CategoryWithCount = WarehouseCategory & {
  slug: string;
  icon: string | null;
  _count: { products: number };
};

export const REASON_MAP: Record<string, { label: string; color: string }> = {
  ORDER: { label: "Захиалга", color: "bg-blue-100 text-blue-700" },
  RETURN: { label: "Буцаалт", color: "bg-amber-100 text-amber-700" },
  RESTOCK: { label: "Нөхөн дүүргэлт", color: "bg-emerald-100 text-emerald-700" },
  MANUAL_ADJUST: { label: "Гар тохиргоо", color: "bg-slate-100 text-slate-700" },
  ORDER_CANCEL: { label: "Захиалга цуцлалт", color: "bg-red-100 text-red-700" },
  DAMAGE: { label: "Гэмтэл", color: "bg-red-100 text-red-700" },
  TRANSFER_IN: { label: "Шилжүүлэг орлого", color: "bg-teal-100 text-teal-700" },
  TRANSFER_OUT: { label: "Шилжүүлэг зарлага", color: "bg-orange-100 text-orange-700" },
  INITIAL_STOCK: { label: "Анхны нөөц", color: "bg-indigo-100 text-indigo-700" },
};
import type { WarehouseCategory } from "@/features/categories";
