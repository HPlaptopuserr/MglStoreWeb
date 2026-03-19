"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  TrendingUp,
  Clock,
  FileText,
  Eye,
  UserPlus,
  Settings,
  ChevronRight,
  CalendarDays,
  Activity,
  Zap,
  BarChart3,
  Loader2,
  Briefcase,
  Phone,
  MapPin,
  GraduationCap,
  Languages,
  Banknote,
  Star,
  Heart,
  X,
  Wallet,
  DollarSign,
} from "lucide-react";
import { PieChart } from "../../../components/organisms/PieChart";
import {
  StatCard,
  QuickAction,
  ActivityItem,
  DetailItem,
} from "../../../components/molecules/DashboardWidgets";

import {
  fetchDashboardStats,
  type DashboardStats,
} from "../../../lib/dashboard-api";
import { API_BASE } from "../../../lib/api";
import {
  JOB_POSITION_LABELS,
  EDUCATION_LABELS,
  GENDER_LABELS,
  getStatusLabel,
  getStatusClass,
  FALLBACK_SPARK,
  AUDIT_ACTION_MAP,
  DEFAULT_AUDIT,
  formatMnDate,
  formatMnTime,
  formatTimeAgo,
  formatNumber,
} from "../../../lib/constants";
import type { JobApplication } from "../../../lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobApps, setJobApps] = useState<JobApplication[]>([]);
  const [jobAppsLoading, setJobAppsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDashboardStats();
      setData(result);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJobApps = useCallback(async () => {
    try {
      setJobAppsLoading(true);
      const res = await fetch(`${API_BASE}/api/job-applications`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const list = await res.json();
      setJobApps(Array.isArray(list) ? list : (list?.data ?? []));
    } catch (err) {
      console.error("Job apps fetch error:", err);
    } finally {
      setJobAppsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadJobApps();
  }, [loadStats, loadJobApps]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const hour = currentTime.getHours();
  const greeting =
    hour < 12 ? "Өглөөний мэнд" : hour < 18 ? "Өдрийн мэнд" : "Оройн мэнд";

  const dateStr = formatMnDate(currentTime);
  const timeStr = formatMnTime(currentTime);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 pb-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">👋</span>
            <p className="text-xs sm:text-sm font-semibold text-indigo-500">
              {greeting}
            </p>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Хяналтын самбар
          </h1>
        </div>

        <div className="flex items-center">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-slate-400 bg-white border border-slate-100 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm">
            <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
            <span className="font-medium">{dateStr}</span>
            <span className="text-slate-300">|</span>
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
            <span className="font-bold text-slate-500">{timeStr}</span>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        {loading ? (
          <div className="col-span-2 lg:col-span-4 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            <StatCard
              icon={Users}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-500"
              label="Нийт хэрэглэгч"
              value={formatNumber(data?.stats.totalUsers ?? 0)}
              trend={`${data?.stats.totalUsers ?? 0}`}
              trendUp={true}
              sparkData={data?.sparklines.users ?? FALLBACK_SPARK.users}
            />
            <StatCard
              icon={Building2}
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
              label="Идэвхтэй байгууллага"
              value={formatNumber(data?.stats.activeOrganizations ?? 0)}
              trend={`${data?.stats.activeOrganizations ?? 0}`}
              trendUp={true}
              sparkData={
                data?.sparklines.organizations ?? FALLBACK_SPARK.companies
              }
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-violet-50"
              iconColor="text-violet-500"
              label="Нийт бүртгэл"
              value={formatNumber(data?.stats.totalRegistrations ?? 0)}
              trend={`${data?.todaySummary.newRequests ?? 0} өнөөдөр`}
              trendUp={(data?.todaySummary.newRequests ?? 0) > 0}
              sparkData={FALLBACK_SPARK.registrations}
            />
            <StatCard
              icon={Briefcase}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-500"
              label="Ирсэн анкет"
              value={formatNumber(data?.stats.totalJobApplications ?? 0)}
              trend={`${data?.todaySummary.todayJobApplications ?? 0} өнөөдөр`}
              trendUp={(data?.todaySummary.todayJobApplications ?? 0) > 0}
              sparkData={
                data?.sparklines.jobApplications ?? FALLBACK_SPARK.revenue
              }
            />
          </>
        )}
      </div>

      {/* ─── Investor Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600/70">Хөрөнгө оруулагчид</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-800">
                    {data?.stats.totalInvestors ?? 0}
                  </p>
                </div>
              </div>
              <p className="text-xs text-amber-600/60">
                Нийт түншүүдийн {data?.stats.activeOrganizations ? Math.round(((data?.stats.totalInvestors ?? 0) / data.stats.activeOrganizations) * 100) : 0}% нь хөрөнгө оруулагч
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/60 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-600/70">Нийт оруулсан хөрөнгө</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800">
                    {((data?.stats.totalInvestmentAmount ?? 0) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-base font-bold text-emerald-500 ml-1">сая ₮</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-emerald-600/60">
                Дундаж: {data?.stats.totalInvestors ? ((data.stats.totalInvestmentAmount / data.stats.totalInvestors) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 0} сая ₮ / хөрөнгө оруулагч
              </p>
            </div>
          </>
        )}
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2.5 sm:mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Түргэн үйлдлүүд
            </h3>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
          <QuickAction
            icon={Eye}
            label="Хүсэлт харах"
            color="bg-indigo-500"
            onClick={() => router.push("/requests")}
          />
          <QuickAction
            icon={UserPlus}
            label="Түнш нэмэх"
            color="bg-emerald-500"
            onClick={() => router.push("/partners")}
          />
          <QuickAction
            icon={FileText}
            label="Ангилал"
            color="bg-rose-500"
            onClick={() => router.push("/categories")}
          />
          <QuickAction
            icon={Briefcase}
            label="Анкетууд"
            color="bg-violet-500"
            onClick={() => router.push("/applications")}
          />
          <QuickAction
            icon={Settings}
            label="Тохиргоо"
            color="bg-slate-500"
            onClick={() => router.push("/settings")}
          />
        </div>
      </div>

      {/* ─── Job Applications Section ─── */}
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
            onClick={() => router.push("/requests")}
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
            {/* Desktop table */}
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
                        {app.jobPosition
                          ? JOB_POSITION_LABELS[app.jobPosition] ||
                            app.jobPosition
                          : "-"}
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
                          onClick={() => setSelectedApp(app)}
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-2.5">
              {jobApps.slice(0, 6).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedApp(app)}
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
                        <div className="text-xs text-slate-400">
                          {app.phone}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${getStatusClass(app.status)}`}
                    >
                      {getStatusLabel(app.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {app.jobPosition
                        ? JOB_POSITION_LABELS[app.jobPosition] ||
                          app.jobPosition
                        : "-"}
                    </span>
                    <span>
                      {new Date(app.createdAt).toLocaleDateString("mn-MN")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {data ? (
          <PieChart
            title="Бүртгэлийн хүсэлтийн тоо"
            total={data.pieChart.total}
            label={data.pieChart.label}
            items={data.pieChart.items.map((item) => ({
              label: `${item.label} (${item.count})`,
              colorClass: "",
            }))}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center min-h-50">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        )}

        {/* Өнөөдрийн товч */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Өнөөдрийн товч
          </h3>

          <div className="space-y-3 flex-1">
            {(() => {
              const s = data?.todaySummary;
              const totalReqs =
                (s?.newRequests ?? 0) + (s?.approved ?? 0) + (s?.rejected ?? 0);
              return [
                {
                  label: "Шинэ хүсэлт",
                  value: s?.newRequests ?? 0,
                  total: Math.max(totalReqs, 1),
                  color: "bg-indigo-500",
                  bgColor: "bg-indigo-50",
                },
                {
                  label: "Зөвшөөрсөн",
                  value: s?.approved ?? 0,
                  total: Math.max(totalReqs, 1),
                  color: "bg-emerald-500",
                  bgColor: "bg-emerald-50",
                },
                {
                  label: "Татгалзсан",
                  value: s?.rejected ?? 0,
                  total: Math.max(totalReqs, 1),
                  color: "bg-rose-500",
                  bgColor: "bg-rose-50",
                },
                {
                  label: "Ирсэн анкет",
                  value: s?.todayJobApplications ?? 0,
                  total: Math.max(s?.todayJobApplications ?? 0, 1),
                  color: "bg-amber-500",
                  bgColor: "bg-amber-50",
                },
              ];
            })().map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {item.value}
                    <span className="text-slate-300 font-medium">
                      /{item.total}
                    </span>
                  </span>
                </div>
                <div
                  className={`h-2 rounded-full ${item.bgColor} overflow-hidden`}
                >
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                    style={{
                      width: `${Math.min(100, (item.value / item.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Recent Activity ─── */}
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

      {/* ─── Detail Modal ─── */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedApp.lastName} {selectedApp.firstName}
                  </h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5 ${getStatusClass(selectedApp.status)}`}
                  >
                    {getStatusLabel(selectedApp.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Хувийн мэдээлэл
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    icon={Phone}
                    label="Утас"
                    value={selectedApp.phone}
                  />
                  <DetailItem
                    icon={FileText}
                    label="Регистр"
                    value={selectedApp.registerNumber}
                  />
                  <DetailItem
                    icon={Users}
                    label="Нас"
                    value={
                      selectedApp.age !== null ? `${selectedApp.age} нас` : null
                    }
                  />
                  <DetailItem
                    icon={Users}
                    label="Хүйс"
                    value={
                      selectedApp.gender
                        ? GENDER_LABELS[selectedApp.gender] ||
                          selectedApp.gender
                        : null
                    }
                  />
                  <div className="col-span-2">
                    <DetailItem
                      icon={MapPin}
                      label="Хаяг"
                      value={selectedApp.address}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Ажлын мэдээлэл
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem
                    icon={Briefcase}
                    label="Албан тушаал"
                    value={
                      selectedApp.jobPosition
                        ? JOB_POSITION_LABELS[selectedApp.jobPosition] ||
                          selectedApp.jobPosition
                        : null
                    }
                  />
                  <DetailItem
                    icon={GraduationCap}
                    label="Боловсрол"
                    value={
                      selectedApp.education
                        ? EDUCATION_LABELS[selectedApp.education] ||
                          selectedApp.education
                        : null
                    }
                  />
                  <DetailItem
                    icon={Banknote}
                    label="Цалингийн хүлээлт"
                    value={selectedApp.salaryExpect}
                  />
                  <DetailItem
                    icon={CalendarDays}
                    label="Огноо"
                    value={new Date(selectedApp.createdAt).toLocaleDateString(
                      "mn-MN",
                    )}
                  />
                  <div className="col-span-2">
                    <DetailItem
                      icon={Clock}
                      label="Туршлага"
                      value={selectedApp.experience}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Ур чадвар
                </h4>
                <div className="space-y-3">
                  <DetailItem
                    icon={Star}
                    label="Мэргэжлийн ур чадвар"
                    value={selectedApp.professionalSkills}
                  />
                  <DetailItem
                    icon={Heart}
                    label="Хувь хүний ур чадвар"
                    value={selectedApp.personalSkills}
                  />
                  <DetailItem
                    icon={Languages}
                    label="Гадаад хэлний мэдлэг"
                    value={selectedApp.languages}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
