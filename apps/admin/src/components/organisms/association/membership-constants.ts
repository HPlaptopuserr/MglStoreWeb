export const MEMBERSHIP_TYPES = {
  ACTIVE: {
    label: "Silver",
    labelShort: "Silver",
    color: "text-slate-700 bg-slate-100 border-slate-200",
    dotColor: "bg-slate-500",
    durations: [
      { months: 1, price: 30000, label: "1 Сар" },
      { months: 6, price: 180000, label: "6 Сар" },
    ],
    description: "Standard product discounts, standard support",
  },
  BRANCH_COUNCIL: {
    label: "Gold",
    labelShort: "Gold",
    color: "text-orange-700 bg-orange-100 border-orange-200",
    dotColor: "bg-orange-500",
    durations: [
      { months: 1, price: 50000, label: "1 Сар" },
      { months: 6, price: 300000, label: "6 Сар" },
    ],
    description: "Priority support, extra discount, free delivery",
  },
  GOVERNING_COUNCIL: {
    label: "Platinum",
    labelShort: "Platinum",
    color: "text-violet-700 bg-violet-100 border-violet-200",
    dotColor: "bg-violet-500",
    durations: [
      { months: 1, price: 100000, label: "1 Сар" },
      { months: 6, price: 600000, label: "6 Сар" },
    ],
    description: "VIP events, concierge support, premium rewards",
  },
} as const;

export type MembershipTypeKey = keyof typeof MEMBERSHIP_TYPES;

export const STATUS_CONFIG = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  APPROVED: {
    label: "Зөвшөөрөгдсөн",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  REJECTED: {
    label: "Татгалзсан",
    color: "text-red-700 bg-red-50 border-red-200",
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
} as const;
