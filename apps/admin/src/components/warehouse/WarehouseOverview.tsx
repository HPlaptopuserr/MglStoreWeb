"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Box,
  Building2,
  Calendar,
  ExternalLink,
  Gauge,
  MapPin,
  Package,
  Phone,
  User,
} from "lucide-react";
import type { WarehouseDetail } from "./types";

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
  progress,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone: string;
  progress?: number;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`rounded-xl p-2.5 transition-transform group-hover:scale-105 ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function WarehouseStats({ warehouse }: { warehouse: WarehouseDetail }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={Package}
        value={warehouse.summary.totalProducts}
        label="Төрөл бараа"
        tone="bg-violet-50 text-[#5B4CFF]"
      />
      <StatCard
        icon={Box}
        value={warehouse.summary.totalQuantity.toLocaleString()}
        label="Нийт тоо ширхэг"
        tone="bg-blue-50 text-blue-600"
      />
      <StatCard
        icon={AlertTriangle}
        value={warehouse.summary.lowStockItems}
        label="Дуусч буй"
        tone="bg-amber-50 text-amber-600"
      />
      <StatCard
        icon={Gauge}
        value={`${warehouse.summary.capacityUsed}%`}
        label="Багтаамж ашигласан"
        tone="bg-emerald-50 text-emerald-600"
        progress={warehouse.summary.capacityUsed}
      />
    </div>
  );
}

export function WarehouseInfo({
  warehouse,
  onOpenOrganization,
}: {
  warehouse: WarehouseDetail;
  onOpenOrganization: (id: string) => void;
}) {
  const details = [
    { icon: MapPin, label: "Хаяг", value: warehouse.address },
    ...(warehouse.phone
      ? [{ icon: Phone, label: "Утас", value: warehouse.phone }]
      : []),
    {
      icon: Box,
      label: "Багтаамж",
      value: `${warehouse.capacity.toLocaleString()} ширхэг`,
    },
    {
      icon: Calendar,
      label: "Үүсгэсэн",
      value: new Date(warehouse.createdAt).toLocaleDateString("mn-MN"),
    },
    ...(warehouse.createdBy
      ? [
          {
            icon: User,
            label: "Үүсгэсэн хэрэглэгч",
            value:
              warehouse.createdBy.profile?.fullName ||
              warehouse.createdBy.email,
          },
        ]
      : []),
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-bold text-slate-950">
          Агуулахын мэдээлэл
        </h3>
        <div className="space-y-4">
          {details.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-slate-50"
            >
              <span className="rounded-lg bg-slate-100 p-2">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-sm text-slate-500">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-4 font-bold text-slate-900">
          Хуваарилагдсан байгууллагууд ({warehouse.organizations.length})
        </h3>
        {warehouse.organizations.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {warehouse.organizations.map((org) => (
              <div
                key={org.id}
                className="group flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {org.name}
                  </p>
                  <p className="text-xs text-slate-500">@{org.slug}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${org.name} дэлгэрэнгүй`}
                  onClick={() => onOpenOrganization(org.id)}
                  className="rounded-lg p-2 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-[#5B4CFF]"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            Хуваарилагдсан байгууллага байхгүй
          </div>
        )}
      </section>
    </div>
  );
}
