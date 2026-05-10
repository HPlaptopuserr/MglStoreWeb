export const MEMBERSHIP_TYPES = {
  BASIC: {
    label: "Энгийн гишүүн",
    labelShort: "Энгийн",
    color: "text-slate-700 bg-slate-100 border-slate-200",
    dotColor: "bg-slate-400",
    durations: [{ months: null, price: 0, label: "Үнэгүй" }],
    description: "Уулзалт, сургалтын мэдээлэл авах, хуваалцах",
  },
  ACTIVE: {
    label: "Идэвхтэй гишүүн",
    labelShort: "Идэвхтэй",
    color: "text-blue-700 bg-blue-100 border-blue-200",
    dotColor: "bg-blue-500",
    durations: [
      { months: 1, price: 60000, label: "1 Сар" },
      { months: 3, price: 120000, label: "3 Сар" },
      { months: 6, price: 180000, label: "6 Сар" },
    ],
    description: "Сургалтад 50% хөнгөлөлт, 5 бараа байршуулах эрх",
  },
  BRANCH_COUNCIL: {
    label: "Салбарын төлөөлөн удирдах зөвлөл",
    labelShort: "Салбарын ТУЗ",
    color: "text-violet-700 bg-violet-100 border-violet-200",
    dotColor: "bg-violet-500",
    durations: [
      { months: 3, price: 360000, label: "3 Сар" },
      { months: 6, price: 600000, label: "6 Сар" },
    ],
    description: "Идэвхтэй эрх + 10 бараа, төсөл удирдах",
  },
  GOVERNING_COUNCIL: {
    label: "Төлөөлөх зөвлөл",
    labelShort: "Төлөөлөх зөвлөл",
    color: "text-amber-700 bg-amber-100 border-amber-200",
    dotColor: "bg-amber-500",
    durations: [
      { months: 6, price: 1800000, label: "6 Сар" },
      { months: 12, price: 3000000, label: "12 Сар" },
    ],
    description: "Бүх эрх + тендер, 20 бараа, хөрөнгө оруулах",
  },
} as const;

export type MembershipTypeKey = keyof typeof MEMBERSHIP_TYPES;

export const STATUS_CONFIG = {
  PENDING: { label: "Хүлээгдэж буй", color: "text-amber-700 bg-amber-50 border-amber-200" },
  APPROVED: { label: "Зөвшөөрөгдсөн", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  REJECTED: { label: "Татгалзсан", color: "text-red-700 bg-red-50 border-red-200" },
  CANCELLED: { label: "Цуцлагдсан", color: "text-slate-600 bg-slate-50 border-slate-200" },
} as const;
