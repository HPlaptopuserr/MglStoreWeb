import { Briefcase, FolderKanban, Store, Tag } from "lucide-react";
import type { NavLinkItem } from "@/types";

export const NAV_LINKS: NavLinkItem[] = [
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
];
