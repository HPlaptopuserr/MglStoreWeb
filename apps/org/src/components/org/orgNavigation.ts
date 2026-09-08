import {
  BarChart3,
  Boxes,
  Building2,
  ChefHat,
  ClipboardList,
  Clapperboard,
  UtensilsCrossed,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  TimerReset,
  Users,
} from "lucide-react";
import { OrgUser } from "@/lib/api";
import { OrgFeatureState } from "@/lib/org-types";
import { canViewWorkforceReport } from "@/lib/workforce-api";

export type OrgNavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  enabled?: boolean;
};

export function getOrgNavItems(
  features: OrgFeatureState,
  user?: OrgUser | null,
): OrgNavItem[] {
  return [
    { label: "Хяналтын самбар", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Байгууллагын profile",
      href: "/dashboard/profile",
      icon: Building2,
    },
    { label: "Ажилтан ба эрх", href: "/dashboard/members", icon: Users },
    {
      label: "Цаг бүртгэлийн тайлан",
      href: "/dashboard/workforce/attendance",
      icon: TimerReset,
      enabled: canViewWorkforceReport(user?.orgRole, user?.capabilities),
    },
    {
      label: "Үйлчилгээний пост",
      href: "/dashboard/service-posts",
      icon: Megaphone,
      enabled: features.servicePosts,
    },
    { label: "Бүтээгдэхүүн", href: "/dashboard/products", icon: Package },
    { label: "Reels", href: "/dashboard/reels", icon: Clapperboard },
    {
      label: "Ресторан касс",
      href: "/dashboard/restaurant-pos",
      icon: UtensilsCrossed,
    },
    {
      label: "Гал тогооны дэлгэц",
      href: "/dashboard/kitchen-display",
      icon: ChefHat,
    },
    {
      label: "Захиалгын бараа",
      href: "/dashboard/preorder",
      icon: ClipboardList,
      enabled: features.preorderProducts,
    },
    {
      label: "Нэгдсэн бараа",
      href: "/dashboard/supply",
      icon: Boxes,
      enabled: features.supplyProducts,
    },
    { label: "Тайлан", href: "/dashboard/reports", icon: BarChart3 },
    { label: "Тохиргоо", href: "/dashboard/settings", icon: Settings },
  ];
}
