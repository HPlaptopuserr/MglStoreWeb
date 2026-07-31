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
    id: "wms-menu",
    title: "Цэс",
    items: [
      {
        id: "overview-menu",
        label: "Хяналт",
        href: "/dashboard",
        icon: LayoutDashboard,
        children: [
          {
            id: "dashboard",
            label: "Хянах самбар",
            href: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            id: "reports",
            label: "Тайлан",
            href: "/reports",
            icon: BarChart3,
          },
        ],
      },
      {
        id: "inventory-menu",
        label: "Нөөц",
        href: "/inventory",
        icon: Package,
        children: [
          {
            id: "inventory",
            label: "Нөөцийн байдал",
            href: "/inventory",
            icon: Package,
          },
          {
            id: "receive",
            label: "Бараа хүлээн авах",
            href: "/receive",
            icon: PackageCheck,
          },
        ],
      },
      {
        id: "online-orders",
        label: "Онлайн захиалга",
        href: "/online-orders",
        icon: ShoppingBag,
      },
      {
        id: "delivery-network",
        label: "Хүргэлтийн сүлжээ",
        href: "/delivery",
        icon: Truck,
      },
      {
        id: "dispatch-menu",
        label: "Гаргалт ба шилжилт",
        href: "/dispatch-orders",
        icon: ClipboardList,
        children: [
          {
            id: "dispatch-orders",
            label: "Илгээмжийн захиалга",
            href: "/dispatch-orders",
            icon: ClipboardList,
          },
          {
            id: "dispatch",
            label: "Бараа гаргах",
            href: "/dispatch",
            icon: PackageMinus,
          },
          {
            id: "transfers",
            label: "Шилжүүлэг",
            href: "/transfers",
            icon: ArrowLeftRight,
          },
          {
            id: "movements",
            label: "Хөдөлгөөний түүх",
            href: "/movements",
            icon: ScrollText,
          },
        ],
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
        id: "system-menu",
        label: "Систем",
        href: "/settings",
        icon: Settings,
        children: [
          {
            id: "settings",
            label: "Тохиргоо",
            href: "/settings",
            icon: Settings,
          },
        ],
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
