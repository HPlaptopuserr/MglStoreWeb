export const REASON_MAP: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  ORDER: { label: "Захиалга", color: "bg-blue-100 text-blue-700", icon: "📦" },
  RETURN: {
    label: "Буцаалт",
    color: "bg-amber-100 text-amber-700",
    icon: "↩️",
  },
  RESTOCK: {
    label: "Нөхөн дүүргэлт",
    color: "bg-emerald-100 text-emerald-700",
    icon: "📥",
  },
  MANUAL_ADJUST: {
    label: "Гар тохиргоо",
    color: "bg-slate-100 text-slate-700",
    icon: "✏️",
  },
  ORDER_CANCEL: {
    label: "Захиалга цуцлалт",
    color: "bg-red-100 text-red-700",
    icon: "❌",
  },
  DAMAGE: { label: "Гэмтэл", color: "bg-red-100 text-red-700", icon: "💥" },
  TRANSFER_IN: {
    label: "Шилжүүлэг орлого",
    color: "bg-teal-100 text-teal-700",
    icon: "📥",
  },
  TRANSFER_OUT: {
    label: "Шилжүүлэг зарлага",
    color: "bg-orange-100 text-orange-700",
    icon: "📤",
  },
  INITIAL_STOCK: {
    label: "Анхны нөөц",
    color: "bg-indigo-100 text-indigo-700",
    icon: "🏁",
  },
};

export const ALL_REASONS = Object.keys(REASON_MAP);

export type LedgerEntry = {
  id: string;
  productId: string;
  change: number;
  reason: string;
  note: string | null;
  createdAt: string;
  referenceId: string | null;
  referenceType: string | null;
  balanceBefore: number | null;
  balanceAfter: number | null;
  documentNumber: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
  };
  createdBy: { id: string; email: string; name: string | null } | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
