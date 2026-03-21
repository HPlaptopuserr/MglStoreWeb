"use client";

import {
  Eye,
  UserPlus,
  FileText,
  Briefcase,
  Settings,
  Zap,
} from "lucide-react";
import { QuickAction } from "../../molecules/DashboardWidgets";

interface DashboardQuickActionsProps {
  onNavigate: (path: string) => void;
}

export function DashboardQuickActions({
  onNavigate,
}: DashboardQuickActionsProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 md:p-5 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            Түргэн үйлдлүүд
          </h3>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">

        <QuickAction
          icon={Eye}
          label="Хүсэлт харах"
          color="bg-indigo-500"
          onClick={() => onNavigate("/requests")}
        />

        <QuickAction
          icon={UserPlus}
          label="Түнш нэмэх"
          color="bg-emerald-500"
          onClick={() => onNavigate("/partners")}
        />

        <QuickAction
          icon={FileText}
          label="Ангилал"
          color="bg-rose-500"
          onClick={() => onNavigate("/categories")}
        />

        <QuickAction
          icon={Briefcase}
          label="Анкетууд"
          color="bg-violet-500"
          onClick={() => onNavigate("/applications")}
        />

        <QuickAction
          icon={Settings}
          label="Тохиргоо"
          color="bg-slate-500"
          onClick={() => onNavigate("/settings")}
        />

      </div>
    </div>
  );
}