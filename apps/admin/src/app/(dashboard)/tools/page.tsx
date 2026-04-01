"use client";

import { useState } from "react";
import { QrCode, ClipboardList } from "lucide-react";
import { QrGeneratorPanel, FormBuilderTool } from "@/components/organisms";

const TABS = [
  { key: "qr", label: "QR үүсгэгч", icon: QrCode },
  { key: "forms", label: "Маягт үүсгэгч", icon: ClipboardList },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminToolsPage() {
  const [tab, setTab] = useState<TabKey>("qr");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
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

      {tab === "qr" && <QrGeneratorPanel showHeader />}
      {tab === "forms" && <FormBuilderTool />}
    </div>
  );
}

