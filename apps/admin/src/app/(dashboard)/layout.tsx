"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Users2,
  Layers,
  Settings,
  Tag,
  Package,
  Briefcase,
  TrendingUp,
  Headphones,
  UserCog,
  Smartphone,
  MessageSquare,
  Search,
  Bell,
  FileText,
  BarChart3,
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
    requires: ["MANAGE_REGISTRATIONS", "MANAGE_JOB_APPLICATIONS", "MANAGE_STOCK", "MANAGE_SERVICES"],
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
  const pathname = usePathname();

  const pageTitle = useMemo(() => {
    if (pathname.startsWith("/dashboard")) return "Хяналтын самбар";
    if (pathname.startsWith("/statistics")) return "Статистик";
    if (pathname.startsWith("/requests")) return "Хүсэлтүүд";
    if (pathname.startsWith("/partners")) return "Түншүүд";
    if (pathname.startsWith("/warehouses")) return "Агуулах";
    if (pathname.startsWith("/settings")) return "Тохиргоо";
    if (pathname.startsWith("/contracts")) return "Хийгдсэн гэрээнүүд";
    if (pathname.startsWith("/sections")) return "Нэмэлт хэсгүүд";
    if (pathname.startsWith("/applications")) return "Ажлын анкет";
    if (pathname.startsWith("/investors")) return "Хөрөнгө оруулалт";
    if (pathname.startsWith("/services")) return "Үйлчилгээ";
    if (pathname.startsWith("/chat")) return "Чат удирдлага";
    if (pathname.startsWith("/categories")) return "Бизнесийн ангилал";
    if (pathname.startsWith("/association")) return "Холбооны гишүүнчлэл";
    return "Admin";
  }, [pathname]);

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
          <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-6 md:flex">
            <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Хайх..."
                  className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  2
                </span>
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {user?.fullName || user?.email || "Admin"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 w-full px-4 pt-2 pb-6 md:px-8 md:pt-8 md:pb-10">
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
