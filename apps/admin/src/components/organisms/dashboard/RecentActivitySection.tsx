"use client";

import { Activity, Loader2 } from "lucide-react";
import type { DashboardStats } from "../../../lib/dashboard-api";
import { ActivityItem } from "../../molecules/DashboardWidgets";
import {
  AUDIT_ACTION_MAP,
  DEFAULT_AUDIT,
  formatTimeAgo,
} from "../../../lib/constants";

interface RecentActivitySectionProps {
  data: DashboardStats | null;
  loading: boolean;
}

export function RecentActivitySection({
  data,
  loading,
}: RecentActivitySectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-bold text-slate-800">
          Сүүлийн үйл ажиллагаа
        </h3>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        ) : data?.activity && data.activity.length > 0 ? (
          data.activity.map((item, i) => {
            const mapping = AUDIT_ACTION_MAP[item.action] || DEFAULT_AUDIT;

            return (
              <ActivityItem
                key={item.id}
                icon={mapping.icon}
                iconBg={mapping.iconBg}
                iconColor={mapping.iconColor}
                title={`${mapping.title} — ${item.userName}`}
                description={mapping.description}
                time={formatTimeAgo(item.createdAt)}
                isLast={i === data.activity.length - 1}
              />
            );
          })
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">
            Үйл ажиллагаа байхгүй байна
          </p>
        )}
      </div>
    </div>
  );
}