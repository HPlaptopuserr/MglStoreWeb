import { Scale, ShieldCheck, UserCog } from "lucide-react";
import type { RoleMeta } from "./types";

export const ITEMS_PER_PAGE = 15;
export const DEFAULT_MEMBERSHIP_DURATION_MONTHS = 12;

export const SYSTEM_ROLE_META: Record<string, RoleMeta> = {
  SUPER_ADMIN: {
    label: "Ерөнхий админ",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: ShieldCheck,
  },
  ADMIN: {
    label: "Админ",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    icon: ShieldCheck,
  },
  HR_ADMIN: {
    label: "Хүний нөөц",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: UserCog,
  },
  CONTENT_ADMIN: {
    label: "Контент админ",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: UserCog,
  },
  PARTNER_ADMIN: {
    label: "Түнш админ",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: UserCog,
  },
  WAREHOUSE_ADMIN: {
    label: "Агуулах админ",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: UserCog,
  },
  FINANCE_ADMIN: {
    label: "Санхүү админ",
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200",
    icon: UserCog,
  },
  SERVICE_ADMIN: {
    label: "Үйлчилгээ админ",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: UserCog,
  },
  LAWYER: {
    label: "Хуульч",
    color: "text-fuchsia-700",
    bg: "bg-fuchsia-50 border-fuchsia-200",
    icon: Scale,
  },
  USER: {
    label: "Хэрэглэгч",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    icon: UserCog,
  },
};

export const CREATE_ADMIN_ROLES = [
  { value: "ADMIN", label: "Админ" },
  { value: "HR_ADMIN", label: "HR Админ" },
  { value: "CONTENT_ADMIN", label: "Контент Админ" },
  { value: "PARTNER_ADMIN", label: "Партнер Админ" },
  { value: "WAREHOUSE_ADMIN", label: "Агуулах Админ" },
  { value: "FINANCE_ADMIN", label: "Санхүү Админ" },
  { value: "SERVICE_ADMIN", label: "Үйлчилгээ Админ" },
  { value: "LAWYER", label: "Хуульч" },
];

export const MEMBERSHIP_DURATION_OPTIONS = [
  { label: "1 жил", months: 12 },
  { label: "6 сар", months: 6 },
  { label: "3 сар", months: 3 },
  { label: "1 сар", months: 1 },
];

export const EMPTY_USERS_SUMMARY = {
  totalUsers: 0,
  activeUsers: 0,
  primeUsers: 0,
  roles: {},
};
