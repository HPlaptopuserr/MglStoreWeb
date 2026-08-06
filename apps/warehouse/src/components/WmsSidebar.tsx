"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackageMinus,
  ShoppingBag,
  ScrollText,
  Settings,
  Truck,
} from "lucide-react";
import { AppSidebar, type AppSidebarGroup } from "@mgl/ui";

const WMS_NAV_GROUPS: AppSidebarGroup[] = [
  {
    id: "overview",
    title: "Хяналт",
    items: [
      {
        id: "dashboard",
        label: "Хянах самбар",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "reports",
        label: "Тайлан, шинжилгээ",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "inventory-operations",
    title: "Нөөцийн ажиллагаа",
    items: [
      {
        id: "receive",
        label: "Бараа хүлээн авах",
        href: "/receive",
        icon: PackageCheck,
        tone: "success",
      },
      {
        id: "inventory",
        label: "Нөөцийн үлдэгдэл",
        href: "/inventory",
        icon: Package,
      },
      {
        id: "movements",
        label: "Хөдөлгөөний түүх",
        href: "/movements",
        icon: ScrollText,
      },
    ],
  },
  {
    id: "order-fulfillment",
    title: "Захиалга ба гаргалт",
    items: [
      {
        id: "online-orders",
        label: "Онлайн захиалга",
        href: "/online-orders",
        icon: ShoppingBag,
        tone: "warning",
      },
      {
        id: "dispatch-orders",
        label: "Барааны хүсэлтүүд",
        href: "/dispatch-orders",
        icon: ClipboardList,
      },
      {
        id: "dispatch",
        label: "Бараа гаргах",
        href: "/dispatch",
        icon: PackageMinus,
      },
    ],
  },
  {
    id: "logistics",
    title: "Логистик",
    items: [
      {
        id: "transfers",
        label: "Агуулах хооронд шилжүүлэх",
        href: "/transfers",
        icon: ArrowLeftRight,
      },
      {
        id: "delivery-network",
        label: "Хүргэлтийн сүлжээ",
        href: "/delivery",
        icon: Truck,
      },
    ],
  },
];

const WMS_BOTTOM_GROUPS: AppSidebarGroup[] = [
  {
    id: "system",
    title: "Доод цэс",
    items: [
      {
        id: "settings",
        label: "Тохиргоо",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

interface WmsSidebarProps {
  warehouseName: string;
  userName: string;
  userInitials: string;
  onSignOut: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function WmsSidebar({
  warehouseName,
  userName,
  userInitials,
  onSignOut,
  onCollapsedChange,
}: WmsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleCollapsedChange = (next: boolean) => {
    setCollapsed(next);
    onCollapsedChange?.(next);
  };

  return (
    <AppSidebar
      userName={userName}
      userRole={warehouseName}
      userInitials={userInitials}
      groups={WMS_NAV_GROUPS}
      bottomGroups={WMS_BOTTOM_GROUPS}
      collapsed={collapsed}
      onCollapsedChange={handleCollapsedChange}
      onSignOut={onSignOut}
      showDesktopSpacer={false}
    />
  );
}
