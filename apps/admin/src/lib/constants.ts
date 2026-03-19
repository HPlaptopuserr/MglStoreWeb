import {
  UserPlus,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  AlertCircle,
} from "lucide-react";

// ── Mongolian label mappings ────────────────────────────

export const JOB_POSITION_LABELS: Record<string, string> = {
  driver: "Жолооч",
  picker: "Бараа бэлтгэгч",
  support: "Хэрэглэгчийн үйлчилгээ",
  admin: "Админ",
};

export const EDUCATION_LABELS: Record<string, string> = {
  incomplete_secondary: "Бүрэн бус дунд",
  high_school: "Бүрэн дунд",
  vocational: "МСҮТ / Коллеж",
  student: "Оюутан",
  bachelor: "Бакалавр",
  master: "Магистр",
  doctor: "Доктор",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Эрэгтэй",
  FEMALE: "Эмэгтэй",
};

// ── Status helpers ──────────────────────────────────────

export function getStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Хүлээгдэж буй";
    case "APPROVED":
      return "Зөвшөөрсөн";
    case "REJECTED":
      return "Татгалзсан";
    default:
      return status;
  }
}

export function getStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-200";
  }
}

// ── Sparkline fallback data ─────────────────────────────

export const FALLBACK_SPARK = {
  users: [120, 132, 101, 134, 190, 230, 210, 250, 270, 300, 340, 310],
  companies: [20, 25, 22, 30, 28, 35, 40, 38, 42, 45, 43, 45],
  registrations: [50, 65, 55, 80, 70, 95, 100, 85, 110, 105, 115, 110],
  revenue: [18, 20, 19, 24, 28, 30, 32, 35, 38, 40, 42, 45],
};

// ── Audit log action → UI mapping ───────────────────────

export const AUDIT_ACTION_MAP: Record<
  string,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    description: string;
  }
> = {
  REGISTRATION_REQUEST_CREATED: {
    icon: UserPlus,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    title: "Шинэ бүртгэл ирсэн",
    description: "Түншийн хүсэлт ирлээ",
  },
  REGISTRATION_REQUEST_APPROVED: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    title: "Хүсэлт зөвшөөрөгдсөн",
    description: "Түншийн хүсэлт батлагдсан",
  },
  REGISTRATION_REQUEST_REJECTED: {
    icon: XCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    title: "Хүсэлт татгалзсан",
    description: "Түншийн хүсэлт татгалзсан",
  },
  LOGIN: {
    icon: Users,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    title: "Нэвтэрсэн",
    description: "Хэрэглэгч нэвтэрсэн",
  },
  ORDER_CREATED: {
    icon: FileText,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    title: "Шинэ захиалга",
    description: "Захиалга үүссэн",
  },
  PRODUCT_PUBLISHED: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    title: "Бүтээгдэхүүн нийтлэгдсэн",
    description: "Шинэ бүтээгдэхүүн нэмэгдсэн",
  },
};

export const DEFAULT_AUDIT = {
  icon: AlertCircle,
  iconBg: "bg-amber-50",
  iconColor: "text-amber-500",
  title: "Үйлдэл",
  description: "",
};

// ── Mongolian date/time formatting ──────────────────────

const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const MN_MONTHS = [
  "1-р сарын", "2-р сарын", "3-р сарын", "4-р сарын",
  "5-р сарын", "6-р сарын", "7-р сарын", "8-р сарын",
  "9-р сарын", "10-р сарын", "11-р сарын", "12-р сарын",
];

export function formatMnDate(d: Date): string {
  return `${d.getFullYear()} оны ${MN_MONTHS[d.getMonth()]} ${d.getDate()}, ${MN_WEEKDAYS[d.getDay()]} гараг`;
}

export function formatMnTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Дөнгөж сая";
  if (mins < 60) return `${mins} минутын өмнө`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  return `${Math.floor(hours / 24)} өдрийн өмнө`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return n.toLocaleString();
  return String(n);
}
