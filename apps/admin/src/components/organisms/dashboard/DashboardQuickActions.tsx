"use client";

import {
  Eye,
  UserPlus,
  FileText,
  Briefcase,
  Settings,
  Zap,
  Package,
  TrendingUp,
  Headphones,
  Layers,
} from "lucide-react";
import { QuickAction } from "../../molecules/DashboardWidgets";

interface DashboardQuickActionsProps {
  onNavigate: (path: string) => void;
  hasPermission?: (p: string) => boolean;
  isFullAdmin?: boolean;
}

export function DashboardQuickActions({
  onNavigate,
  hasPermission,
  isFullAdmin = false,
}: DashboardQuickActionsProps) {
  const can = (p: string) => isFullAdmin || (hasPermission ? hasPermission(p) : true);

  const actions: { icon: typeof Eye; label: string; color: string; path: string; permission: string }[] = [
    { icon: Eye, label: "Хүсэлт харах", color: "bg-indigo-500", path: "/requests", permission: "MANAGE_REGISTRATIONS" },
    { icon: UserPlus, label: "Түнш нэмэх", color: "bg-emerald-500", path: "/partners", permission: "MANAGE_ORGANIZATIONS" },
    { icon: FileText, label: "Ангилал", color: "bg-rose-500", path: "/categories", permission: "MANAGE_CATEGORIES" },
    { icon: Briefcase, label: "Анкетууд", color: "bg-violet-500", path: "/applications", permission: "MANAGE_JOB_APPLICATIONS" },
    { icon: Package, label: "Агуулах", color: "bg-amber-500", path: "/warehouses", permission: "MANAGE_WAREHOUSES" },
    { icon: TrendingUp, label: "Хөрөнгө оруулалт", color: "bg-cyan-500", path: "/investors", permission: "MANAGE_INVESTORS" },
    { icon: Headphones, label: "Үйлчилгээ", color: "bg-pink-500", path: "/services", permission: "MANAGE_SERVICES" },
    { icon: Layers, label: "Нэмэлт хэсэг", color: "bg-teal-500", path: "/sections", permission: "MANAGE_SITE_CONTENT" },
    { icon: Settings, label: "Тохиргоо", color: "bg-slate-500", path: "/settings", permission: "MANAGE_SITE_SETTINGS" },
  ];

  const visible = actions.filter((a) => can(a.permission));

  if (visible.length === 0) return null;

  const gridCols = visible.length <= 3 ? "grid-cols-3" : visible.length <= 5 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-5";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            Түргэн үйлдлүүд
          </h3>
        </div>
      </div>
      <div className={`grid ${gridCols} gap-2 md:gap-3`}>
        {visible.map((a) => (
          <QuickAction
            key={a.path}
            icon={a.icon}
            label={a.label}
            color={a.color}
            onClick={() => onNavigate(a.path)}
          />
        ))}
      </div>
    </div>
  );
}