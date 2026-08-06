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
    title: "Нүүр",
    items: [
      {
        id: "dashboard",
        label: "Хянах самбар",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "daily-work",
    title: "Өдөр тутмын ажил",
    items: [
      {
        id: "dispatch-orders",
        label: "Ирсэн хүсэлт шалгах",
        href: "/dispatch-orders",
        icon: ClipboardList,
        tone: "warning",
      },
      {
        id: "receive",
        label: "Бараа хүлээн авах",
        href: "/receive",
        icon: PackageCheck,
        tone: "success",
      },
      {
        id: "dispatch",
        label: "Бараа бэлтгэж гаргах",
        href: "/dispatch",
        icon: PackageMinus,
      },
      {
        id: "online-orders",
        label: "Онлайн захиалга бэлтгэх",
        href: "/online-orders",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "inventory-logistics",
    title: "Нөөц ба логистик",
    items: [
      {
        id: "inventory",
        label: "Нөөцийн үлдэгдэл",
        href: "/inventory",
        icon: Package,
      },
      {
        id: "transfers",
        label: "Агуулах хооронд шилжүүлэг",
        href: "/transfers",
        icon: ArrowLeftRight,
      },
      {
        id: "delivery-network",
        label: "Хүргэлтийн сүлжээ",
        href: "/delivery",
        icon: Truck,
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
    id: "analytics",
    title: "Хяналт ба тайлан",
    items: [
      {
        id: "reports",
        label: "Тайлан, шинжилгээ",
        href: "/reports",
        icon: BarChart3,
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
