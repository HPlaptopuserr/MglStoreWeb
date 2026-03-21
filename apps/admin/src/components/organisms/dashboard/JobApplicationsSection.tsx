"use client";

import { Briefcase, ChevronRight, Eye, Loader2, Users } from "lucide-react";
import type { JobApplication } from "../../../lib/types";
import {
  getStatusClass,
  getStatusLabel,
} from "../../../lib/constants";

interface JobApplicationsSectionProps {
  jobApps: JobApplication[];
  jobAppsLoading: boolean;
  onSelectApp: (app: JobApplication) => void;
  onViewAll: () => void;
}

export function JobApplicationsSection({
  jobApps,
  jobAppsLoading,
  onSelectApp,
  onViewAll,
}: JobApplicationsSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-bold text-slate-800">Ажлын анкетууд</h3>
          {!jobAppsLoading && (
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {jobApps.length}
            </span>
          )}
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1"
        >
          Бүгдийг харах
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {jobAppsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      ) : jobApps.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-10">
          Анкет ирээгүй байна
        </p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5">Нэр</th>
                  <th className="px-3 py-2.5">Утас</th>
                  <th className="px-3 py-2.5">Албан тушаал</th>
                  <th className="px-3 py-2.5">Огноо</th>
                  <th className="px-3 py-2.5">Төлөв</th>
                  <th className="px-3 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobApps.slice(0, 8).map((app) => (
                  <tr
                    key={app.id}
                    className="group hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {app.lastName} {app.firstName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {app.phone}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {app.jobPosition?.name || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString("mn-MN")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClass(app.status)}`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onSelectApp(app)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Дэлгэрэнгүй
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2.5">
            {jobApps.slice(0, 6).map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApp(app)}
                className="w-full text-left bg-slate-50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {app.lastName} {app.firstName}
                      </div>
                      <div className="text-xs text-slate-400">{app.phone}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${getStatusClass(app.status)}`}
                  >
                    {getStatusLabel(app.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{app.jobPosition?.name || "-"}</span>
                  <span>{new Date(app.createdAt).toLocaleDateString("mn-MN")}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}