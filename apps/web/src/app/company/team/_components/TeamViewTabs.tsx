import { Building2, Crown, Users } from "lucide-react";

export type TeamViewTab = "employees" | "network" | "leadership";

const TEAM_VIEW_TABS = [
  {
    id: "employees",
    label: "Ажилчид",
    icon: Users,
  },
  {
    id: "network",
    label: "Сүлжээ компаниуд",
    icon: Building2,
  },
  {
    id: "leadership",
    label: "Удирдлага",
    icon: Crown,
  },
] as const;

export function TeamViewTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TeamViewTab;
  onTabChange: (tab: TeamViewTab) => void;
}) {
  return (
    <div className="mb-6 overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:min-w-0">
        {TEAM_VIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-black transition sm:flex-none ${
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
