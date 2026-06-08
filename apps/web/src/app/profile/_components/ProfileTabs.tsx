import { FileArchive, Lock, MapPin, PackageCheck, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import type { ProfileTab } from "./types";

const tabs: Array<{
  id: ProfileTab;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  {
    id: "library",
    label: "Миний сан",
    description: "Файл, franchise, M point",
    icon: FileArchive,
  },
  {
    id: "orders",
    label: "Захиалга",
    description: "Бараа, хүргэлт, төлөв",
    icon: PackageCheck,
  },
  {
    id: "profile",
    label: "Хувийн мэдээлэл",
    description: "Нэр, зураг, холбоо барих",
    icon: UserRound,
  },
  {
    id: "address",
    label: "Хаяг ба зөвшөөрөл",
    description: "Хүргэлтийн хаяг, үйлчилгээний нөхцөл",
    icon: MapPin,
  },
  {
    id: "security",
    label: "Нууцлал",
    description: "Нууц үг солих",
    icon: Lock,
  },
];

export function ProfileTabs({
  active,
  onChange,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <nav className="grid gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_12px_36px_rgba(15,23,42,0.06)] md:grid-cols-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`group flex min-h-[68px] items-center gap-3 rounded-2xl px-3 text-left transition ${
              isActive
                ? "bg-orange-50 text-slate-950 ring-1 ring-orange-200"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                isActive
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 group-hover:bg-white"
              }`}
            >
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">{tab.label}</span>
              <span
                className={`mt-0.5 block truncate text-xs font-semibold ${
                  isActive ? "text-orange-700/70" : "text-slate-400"
                }`}
              >
                {tab.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
