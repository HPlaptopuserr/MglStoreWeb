"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  GraduationCap,
  Headphones,
  Layers,
  LayoutGrid,
  MessageSquare,
  Package,
  PackageSearch,
  Settings,
  ShieldCheck,
  Smartphone,
  Tag,
  TrendingUp,
  UserCog,
  Users,
  Users2,
} from "lucide-react";
import {
  AppSidebar,
  type AppSidebarGroup,
  type AppSidebarItem,
} from "./AppSidebar";

export interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
  href: string;
  isActive?: boolean;
}

export interface SidebarProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  onSignOut?: () => void;
  navItems?: NavItem[];
  /** Optional slot rendered above the footer actions (e.g. account switcher) */
  bottomSlot?: ReactNode;
}

const ADMIN_MENU_SECTIONS: AppSidebarItem[] = [
  {
    id: "overview-menu",
    label: "Хяналт",
    icon: LayoutGrid,
    href: "/dashboard",
    children: [
      {
        id: "dashboard",
        label: "Хяналтын самбар",
        icon: LayoutGrid,
        href: "/dashboard",
      },
      {
        id: "statistics",
        label: "Статистик",
        icon: BarChart3,
        href: "/statistics",
      },
    ],
  },
  {
    id: "requests-menu",
    label: "Хүсэлт ба бүртгэл",
    icon: Users,
    href: "/requests",
    children: [
      {
        id: "requests",
        label: "Хүсэлтүүд",
        icon: Users,
        href: "/requests",
      },
      {
        id: "association",
        label: "Холбооны гишүүнчлэл",
        icon: Users2,
        href: "/association",
      },
      {
        id: "study-registrations",
        label: "Сургалтын бүртгэл",
        icon: GraduationCap,
        href: "/study-registrations",
      },
      {
        id: "contracts",
        label: "Гэрээний мэдээлэл",
        icon: FileText,
        href: "/contracts",
      },
    ],
  },
  {
    id: "partners-menu",
    label: "Байгууллага ба агуулах",
    icon: Building2,
    href: "/partners",
    children: [
      {
        id: "partners",
        label: "Түншүүд",
        icon: Users,
        href: "/partners",
      },
      {
        id: "card-terminal-requests",
        label: "Card Terminal хүсэлт",
        icon: CreditCard,
        href: "/partners/card-terminal-requests",
      },
      {
        id: "vendor-content-review",
        label: "Vendor бараа хяналт",
        icon: ShieldCheck,
        href: "/vendor-content-review",
      },
      {
        id: "warehouses",
        label: "Агуулах",
        icon: Package,
        href: "/warehouses",
      },
    ],
  },
  {
    id: "content-menu",
    label: "Контент ба үйлчилгээ",
    icon: Layers,
    href: "/sections",
    children: [
      {
        id: "sections",
        label: "Нэмэлт хэсгүүд",
        icon: Layers,
        href: "/sections",
      },
      {
        id: "product-development",
        label: "Бүтээгдэхүүн хөгжүүлэлт",
        icon: PackageSearch,
        href: "/product-development",
      },
      {
        id: "services",
        label: "Үйлчилгээ",
        icon: Headphones,
        href: "/services",
      },
      {
        id: "chat",
        label: "Чат удирдлага",
        icon: MessageSquare,
        href: "/chat",
      },
    ],
  },
  {
    id: "management-menu",
    label: "Удирдлага",
    icon: UserCog,
    href: "/hr",
    children: [
      {
        id: "hr",
        label: "Хүний нөөц",
        icon: UserCog,
        href: "/hr",
      },
      {
        id: "applications",
        label: "Ажлын анкет",
        icon: Briefcase,
        href: "/applications",
      },
      {
        id: "investors",
        label: "Хөрөнгө оруулалт",
        icon: TrendingUp,
        href: "/investors",
      },
    ],
  },
  {
    id: "system-menu",
    label: "Систем",
    icon: Settings,
    href: "/settings",
    children: [
      {
        id: "settings",
        label: "Тохиргоо",
        icon: Settings,
        href: "/settings",
      },
      {
        id: "categories",
        label: "Бизнесийн ангилал",
        icon: Tag,
        href: "/categories",
      },
      {
        id: "app-control",
        label: "App Control",
        icon: Smartphone,
        href: "/app-control",
      },
    ],
  },
];

const DEFAULT_ADMIN_GROUPS: AppSidebarGroup[] = [
  {
    id: "admin-menu",
    title: "Цэс",
    items: ADMIN_MENU_SECTIONS,
  },
];

function withActiveState(items: NavItem[], pathname: string | null) {
  return items.map((item) => {
    const exactOrNested =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === item.href || pathname?.startsWith(`${item.href}/`);
    const hasMoreSpecificMatch = items.some(
      (other) =>
        other.href !== item.href &&
        other.href.startsWith(`${item.href}/`) &&
        (pathname === other.href || pathname?.startsWith(`${other.href}/`)),
    );

    return {
      ...item,
      isActive:
        item.isActive ?? Boolean(exactOrNested && !hasMoreSpecificMatch),
    };
  });
}

function applyPermittedItems(
  templateItems: AppSidebarItem[],
  permittedItems: Map<string, AppSidebarItem>,
): AppSidebarItem[] {
  return templateItems.flatMap((item) => {
    const children = item.children
      ? applyPermittedItems(item.children, permittedItems)
      : undefined;
    const permittedItem = permittedItems.get(item.id);

    if (children?.length) {
      return [
        {
          ...item,
          ...permittedItem,
          children,
        },
      ];
    }

    return permittedItem ? [permittedItem] : [];
  });
}

function groupAdminItems(
  items: NavItem[],
  pathname: string | null,
): AppSidebarGroup[] {
  const permittedItems = new Map(
    withActiveState(items, pathname).map((item) => [
      item.id,
      item as AppSidebarItem,
    ]),
  );
  const menuItems = applyPermittedItems(ADMIN_MENU_SECTIONS, permittedItems);
  const knownIds = new Set(
    ADMIN_MENU_SECTIONS.flatMap((item) =>
      item.children ? item.children.map((child) => child.id) : [item.id],
    ),
  );
  const otherItems = items.filter((item) => !knownIds.has(item.id));

  return [
    {
      id: "admin-menu",
      title: "Цэс",
      items: menuItems.concat(otherItems),
    },
  ].filter((group) => group.items.length > 0);
}

export function AdminSidebar({
  userName = "Admin User",
  userRole = "ADMIN",
  userInitials = "AD",
  onSignOut,
  navItems,
  bottomSlot,
}: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const groups = navItems
    ? groupAdminItems(navItems, pathname)
    : DEFAULT_ADMIN_GROUPS;

  return (
    <AppSidebar
      userName={userName}
      userRole={userRole}
      userInitials={userInitials}
      groups={groups}
      collapsed={isCollapsed}
      onCollapsedChange={setIsCollapsed}
      onSignOut={onSignOut}
      bottomSlot={bottomSlot}
    />
  );
}
