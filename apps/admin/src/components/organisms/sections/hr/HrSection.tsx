"use client";

import { useState } from "react";
import { Users, UserCog, Building2 } from "lucide-react";
import { SystemUsersSection } from "./SystemUsersSection";
import { OrgStaffTab } from "./OrgStaffTab";

const TABS = [
  { key: "users", label: "Системийн хэрэглэгчид", icon: UserCog },
  { key: "staff", label: "Байгууллагын ажилтнууд", icon: Building2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function HrSection() {
  const [tab, setTab] = useState<TabKey>("users");

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Хүний нөөц</h2>
          <p className="text-xs text-slate-400">Хэрэглэгчид, байгууллагын ажилтнуудын удирдлага</p>
        </div>
      </div>

      {/* tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* tab content */}
      {tab === "users" && <SystemUsersSection />}
      {tab === "staff" && <OrgStaffTab />}
    </div>
  );
}
