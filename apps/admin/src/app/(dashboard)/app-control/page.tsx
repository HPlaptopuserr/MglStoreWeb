"use client";

import { useState } from "react";
import { Smartphone, Store } from "lucide-react";
import { MglStoreTab } from "@/components/organisms/app-control/MglStoreTab";
import { MglBusinessTab } from "@/components/organisms/app-control/MglBusinessTab";

type Tab = "mgl-store" | "mgl-business";

const TABS: { key: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "mgl-store", label: "MGL Store", icon: Store, desc: "Store web/app тохиргоо" },
  { key: "mgl-business", label: "MGL Business", icon: Smartphone, desc: "Business web status" },
];

export default function AppControlPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mgl-store");

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">App Control</h1>
        <p className="mt-1 text-sm text-slate-400">
          Мобайл аппликэйшнүүдийн тохиргоо, контент удирдлагыг хянана
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`group flex items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all ${
                isActive
                  ? "border-violet-200 bg-violet-50 shadow-sm ring-2 ring-violet-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                }`}
              >
                <tab.icon size={18} />
              </div>
              <div className="text-left">
                <p
                  className={`text-sm font-bold transition-colors ${
                    isActive ? "text-violet-700" : "text-slate-700"
                  }`}
                >
                  {tab.label}
                </p>
                <p className="text-[11px] text-slate-400">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        {activeTab === "mgl-store" && <MglStoreTab />}
        {activeTab === "mgl-business" && <MglBusinessTab />}
      </div>
    </div>
  );
}
