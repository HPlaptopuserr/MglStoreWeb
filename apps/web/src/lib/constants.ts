/** Mongolian translations for business categories */
export const CATEGORY_MN: Record<string, string> = {
  Electronics: "Цахилгаан бараа",
  electronics: "Цахилгаан бараа",
  Food: "Хүнс",
  food: "Хүнс",
  Clothing: "Хувцас",
  clothing: "Хувцас",
  Retail: "Жижиглэн худалдаа",
  retail: "Жижиглэн худалдаа",
  Pharmacy: "Эмийн сан",
  pharmacy: "Эмийн сан",
  "Building-Materials": "Барилгын материал",
  "building-materials": "Барилгын материал",
  "Building Materials": "Барилгын материал",
  Service: "Үйлчилгээ",
  service: "Үйлчилгээ",
  Grocery: "Хүнсний дэлгүүр",
  grocery: "Хүнсний дэлгүүр",
  Fashion: "Загвар өмсгөл",
  fashion: "Загвар өмсгөл",
  Beauty: "Гоо сайхан",
  beauty: "Гоо сайхан",
  Health: "Эрүүл мэнд",
  health: "Эрүүл мэнд",
  Sports: "Спорт",
  sports: "Спорт",
  Automotive: "Авто машин",
  automotive: "Авто машин",
  Education: "Боловсрол",
  education: "Боловсрол",
  Restaurant: "Ресторан",
  restaurant: "Ресторан",
  Cafe: "Кафе",
  cafe: "Кафе",
  Hotel: "Зочид буудал",
  hotel: "Зочид буудал",
  Travel: "Аялал жуулчлал",
  travel: "Аялал жуулчлал",
  IT: "Мэдээллийн технологи",
  it: "Мэдээллийн технологи",
  Бизнес: "Бизнес",
  Construction: "Барилга",
  construction: "Барилга",
  "Convenience-Store": "Тохиромжтой дэлгүүр",
  "convenience-store": "Тохиромжтой дэлгүүр",
  Taxi: "Такси",
  taxi: "Такси",
  Logistics: "Логистик",
  logistics: "Логистик",
  Wholesale: "Бөөний худалдаа",
  wholesale: "Бөөний худалдаа",
};

export const toCategoryMN = (cat: string): string => {
  const stripped = cat.replace(/^-+/, "");
  return (
    CATEGORY_MN[cat] ||
    CATEGORY_MN[cat.toLowerCase()] ||
    CATEGORY_MN[stripped] ||
    CATEGORY_MN[stripped.toLowerCase()] ||
    stripped
  );
};

/** Brand accent color used across the web app */
export const BRAND_ACCENT = "#FFAD02";

/** Combined height of the fixed header rows */
export const HEADER_HEIGHT = "128px";

/** Rotating color pairs for category badges */
export const CATEGORY_COLORS = [
  "bg-emerald-50 text-emerald-600",
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-600",
  "bg-rose-50 text-rose-600",
  "bg-purple-50 text-purple-600",
  "bg-cyan-50 text-cyan-600",
  "bg-orange-50 text-orange-600",
  "bg-pink-50 text-pink-600",
];

import type { LucideIcon } from "lucide-react";
import {
  Store,
  Tag,
  Briefcase,
  Wrench,
  QrCode,
  FolderKanban,
  GraduationCap,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const NAV_LINKS: NavLink[] = [
  {
    href: "/organizations",
    label: "Дэлгүүрүүд",
    desc: "Бүх түнш дэлгүүрүүд",
    icon: Store,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/products",
    label: "Бүтээгдэхүүн",
    desc: "Бараа бүтээгдэхүүн",
    icon: Tag,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/services",
    label: "Үйлчилгээ",
    desc: "Байгууллагын үйлчилгээнүүд",
    icon: Wrench,
    color: "bg-purple-50 text-purple-600",
  },
  {
    href: "/study",
    label: "Сургалт",
    desc: "Сургалт, материал",
    icon: GraduationCap,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/franchise",
    label: "Франчайз",
    desc: "Үнэгүй франчайз PDF",
    icon: FolderKanban,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    href: "/projects",
    label: "Төсөл",
    desc: "Dynamic QR төлбөртэй дэлгэрэнгүй",
    icon: FolderKanban,
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/company/partnership",
    label: "Хамтрах",
    desc: "Бизнесээ холбох",
    icon: Briefcase,
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/apply",
    label: "Маягт & QR",
    desc: "Маягт бөглөх, QR код",
    icon: QrCode,
    color: "bg-rose-50 text-rose-600",
  },
];
