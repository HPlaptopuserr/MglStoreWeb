"use client";

import { useMemo, type ReactNode } from "react";
import {
  LayoutGrid,
  Users,
  Users2,
  Layers,
  Settings,
  Tag,
  Package,
  PackageSearch,
  Briefcase,
  TrendingUp,
  Headphones,
  UserCog,
  Smartphone,
  MessageSquare,
  FileText,
  BarChart3,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { AdminSidebar, type NavItem } from "@mgl/ui";
import { MobileDashboard } from "@/components/organisms/MobileDashboard";
import { AccountSwitcher } from "@/components/organisms/AccountSwitcher";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";

// ─── Nav item definitions with required permissions ─────────────────────
type ProtectedNavItem = NavItem & { requires?: string[] };

const ALL_NAV_ITEMS: ProtectedNavItem[] = [
  {
    id: "dashboard",
    label: "Хяналтын самбар",
    icon: LayoutGrid,
    href: "/dashboard",
    requires: ["VIEW_SYSTEM_DASHBOARD"],
  },
  {
    id: "statistics",
    label: "Статистик",
    icon: BarChart3,
    href: "/statistics",
    requires: ["VIEW_SYSTEM_DASHBOARD"],
  },
  {
    id: "requests",
    label: "Хүсэлтүүд",
    icon: Users,
    href: "/requests",
    requires: [
      "MANAGE_REGISTRATIONS",
      "MANAGE_JOB_APPLICATIONS",
      "MANAGE_STOCK",
      "MANAGE_SERVICES",
    ],
  },
  {
    id: "hr",
    label: "Хүний нөөц",
    icon: UserCog,
    href: "/hr",
    requires: ["MANAGE_USERS"],
  },
  {
    id: "applications",
    label: "Ажлын анкет",
    icon: Briefcase,
    href: "/applications",
    requires: ["MANAGE_JOB_APPLICATIONS"],
  },
  {
    id: "partners",
    label: "Түншүүд",
    icon: Users,
    href: "/partners",
    requires: ["MANAGE_ORGANIZATIONS"],
  },
  {
    id: "vendor-content-review",
    label: "Vendor бараа хяналт",
    icon: ShieldCheck,
    href: "/vendor-content-review",
    requires: ["MANAGE_ORGANIZATIONS"],
  },
  {
    id: "warehouses",
    label: "Агуулах",
    icon: Package,
    href: "/warehouses",
    requires: ["MANAGE_WAREHOUSES"],
  },
  {
    id: "investors",
    label: "Хөрөнгө оруулалт",
    icon: TrendingUp,
    href: "/investors",
    requires: ["MANAGE_INVESTORS"],
  },
  {
    id: "services",
    label: "Үйлчилгээ",
    icon: Headphones,
    href: "/services",
    requires: ["MANAGE_SERVICES"],
  },
  {
    id: "chat",
    label: "Чат удирдлага",
    icon: MessageSquare,
    href: "/chat",
    requires: ["MANAGE_CHAT"],
  },
  {
    id: "association",
    label: "Холбооны гишүүнчлэл",
    icon: Users2,
    href: "/association",
    requires: ["MANAGE_REGISTRATIONS"],
  },
  {
    id: "study-registrations",
    label: "Сургалтын бүртгэл",
    icon: GraduationCap,
    href: "/study-registrations",
    requires: ["MANAGE_SITE_SETTINGS"],
  },
  {
    id: "contracts",
    label: "Гэрээний мэдээлэл",
    icon: FileText,
    href: "/contracts",
    requires: ["VIEW_SYSTEM_DASHBOARD"],
  },
  {
    id: "sections",
    label: "Нэмэлт хэсгүүд",
    icon: Layers,
    href: "/sections",
    requires: ["VIEW_SYSTEM_DASHBOARD"],
  },
  {
    id: "product-development",
    label: "Бүтээгдэхүүн хөгжүүлэлт",
    icon: PackageSearch,
    href: "/product-development",
    requires: ["MANAGE_SITE_SETTINGS"],
  },
  {
    id: "categories",
    label: "Бизнесийн ангилал",
    icon: Tag,
    href: "/categories",
    requires: ["MANAGE_CATEGORIES"],
  },
  {
    id: "app-control",
    label: "App Control",
    icon: Smartphone,
    href: "/app-control",
    requires: ["MANAGE_SITE_SETTINGS"],
  },
  {
    id: "settings",
    label: "Тохиргоо",
    icon: Settings,
    href: "/settings",
    requires: ["MANAGE_SITE_SETTINGS"],
  },
];

// ─── Inner layout (uses auth context) ───────────────────────────────────
function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout, hasAnyPermission, isFullAdmin, initials } =
    useAdminAuth();

  const filteredNavItems = useMemo(() => {
    if (isFullAdmin) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter(
      (item) => !item.requires || hasAnyPermission(...item.requires),
    );
  }, [isFullAdmin, hasAnyPermission]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Mobile header / drawer */}
      <div className="md:hidden">
        <MobileDashboard
          onSignOut={logout}
          userName={user?.fullName || user?.email || "Admin"}
          userRole={user?.roleLabel || user?.role || "ADMIN"}
          userInitials={initials}
          navItems={filteredNavItems}
        />
      </div>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AdminSidebar
            onSignOut={logout}
            userName={user?.fullName || user?.email || "Admin"}
            userRole={user?.roleLabel || user?.role || "ADMIN"}
            userInitials={initials}
            navItems={filteredNavItems}
            bottomSlot={<AccountSwitcher />}
          />
        </div>

        {/* Page content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 w-full px-4 pt-2 pb-6 md:px-8 md:pt-6 md:pb-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Exported layout (wraps with AuthProvider) ──────────────────────────
export default function SharedDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AdminAuthProvider>
  );
}
