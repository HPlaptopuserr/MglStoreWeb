"use client";

import Link from "next/link";
import type { Movement } from "./types";
import { REASON_MAP } from "./types";

export function RecentMovements({
  movements,
  onSelect,
}: {
  movements: Movement[];
  onSelect: (m: Movement) => void;
}) {
  if (movements.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          Сүүлийн хөдөлгөөнүүд
        </h2>
        <Link
          href="/movements"
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Бүгдийг харах →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-2 pr-4 font-semibold">Огноо</th>
              <th className="pb-2 pr-4 font-semibold">Бараа</th>
              <th className="pb-2 pr-4 font-semibold">Төрөл</th>
              <th className="pb-2 pr-4 text-right font-semibold">Өөрчлөлт</th>
              <th className="pb-2 font-semibold">Хэрэглэгч</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((mv) => {
              const r = REASON_MAP[mv.reason] || {
                label: mv.reason,
                color: "bg-slate-100 text-slate-700",
              };
              const isPositive = mv.change > 0;
              return (
                <tr
                  key={mv.id}
                  onClick={() => onSelect(mv)}
                  className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-blue-50/40"
                >
                  <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">
                    {new Date(mv.createdAt).toLocaleDateString("mn-MN")}{" "}
                    <span className="text-slate-400">
                      {new Date(mv.createdAt).toLocaleTimeString("mn-MN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-slate-900">
                      {mv.product.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {mv.product.sku || "—"}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${r.color}`}
                    >
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <span
                      className={`font-bold ${isPositive ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {isPositive ? "+" : ""}
                      {mv.change}
                    </span>
                  </td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {mv.createdBy?.profile?.fullName ||
                      mv.createdBy?.email ||
                      "Систем"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
