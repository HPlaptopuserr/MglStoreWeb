import { FileArchive, Lock, MapPin, PackageCheck, Settings, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import Link from "next/link";
import type { ProfileTab } from "./types";

const primaryTabs: Array<{
  id: ProfileTab;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  {
    id: "orders",
    label: "Захиалга",
    description: "Бараа, хүргэлт, төлөв",
    icon: PackageCheck,
  },
  {
    id: "library",
    label: "Миний сан",
    description: "Файл, franchise, M point",
    icon: FileArchive,
  },
];

const settingTabs: Array<{
  id: ProfileTab;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  {
    id: "profile",
    label: "Хувийн мэдээлэл",
    description: "Нэр, зураг, холбоо барих",
    icon: UserRound,
  },
  {
    id: "address",
    label: "Хаяг",
    description: "Хүргэлт, зөвшөөрөл",
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
    <nav className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        {primaryTabs.map((tab) => (
          <ProfileTabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onClick={() => onChange(tab.id)}
          />
        ))}
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Settings size={17} />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-950">Тохиргоо</h2>
            <p className="text-xs font-semibold text-slate-400">
              Хувийн мэдээлэл, хаяг, нууцлал
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {settingTabs.map((tab) => (
            <ProfileSettingsLink
              key={tab.id}
              tab={tab}
            />
          ))}
        </div>
      </section>
    </nav>
  );
}

function ProfileSettingsLink({
  tab,
}: {
  tab: {
    id: ProfileTab;
    label: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
  };
}) {
  const Icon = tab.icon;

  return (
    <Link
      href={`/profile/settings?section=${tab.id}`}
      className="group flex min-h-[54px] items-center gap-2 rounded-2xl px-2.5 text-left text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 sm:min-h-[58px] sm:gap-3 sm:px-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-white">
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black sm:text-sm">
          {tab.label}
        </span>
        <span className="mt-0.5 hidden truncate text-xs font-semibold text-slate-400 sm:block">
          {tab.description}
        </span>
      </span>
    </Link>
  );
}

function ProfileTabButton({
  tab,
  active,
  onClick,
  compact = false,
}: {
  tab: {
    id: ProfileTab;
    label: string;
    description: string;
    icon: ComponentType<{ size?: number }>;
  };
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[54px] items-center gap-2 rounded-2xl px-2.5 text-left transition sm:gap-3 sm:px-3 ${
        compact ? "sm:min-h-[58px]" : "sm:min-h-[64px]"
      } ${
        active
          ? "bg-orange-50 text-slate-950 ring-1 ring-orange-200"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
          active
            ? "bg-orange-500 text-white shadow-sm"
            : "bg-slate-100 text-slate-500 group-hover:bg-white"
        }`}
      >
        <Icon size={19} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-black sm:text-sm">
          {tab.label}
        </span>
        <span
          className={`mt-0.5 hidden truncate text-xs font-semibold sm:block ${
            active ? "text-orange-700/70" : "text-slate-400"
          }`}
        >
          {tab.description}
        </span>
      </span>
    </button>
  );
}
