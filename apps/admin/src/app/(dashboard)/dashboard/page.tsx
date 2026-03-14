"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  UserPlus,
  Settings,
  Bell,
  ChevronRight,
  CalendarDays,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  RevenueChart,
  TimeRange,
} from "../../../components/organisms/RevenueChart";
import { PieChart } from "../../../components/organisms/PieChart";

import { MOCK_REVENUE_DATA, MOCK_PIE_CHART_DATA } from "../../../lib/mock-data";

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  trendUp,
  sparkData,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  sparkData: number[];
}) {
  const max = Math.max(...sparkData);
  const min = Math.min(...sparkData);
  const range = max - min || 1;
  const points = sparkData
    .map((v, i) => {
      const x = (i / (sparkData.length - 1)) * 80;
      const y = 24 - ((v - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div
            className={`p-2 sm:p-2.5 rounded-xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <svg
            width="60"
            height="24"
            viewBox="0 0 80 28"
            className="opacity-40 group-hover:opacity-70 transition-opacity hidden sm:block"
          >
            <polyline
              points={points}
              fill="none"
              stroke={trendUp ? "#10b981" : "#f43f5e"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="text-lg sm:text-2xl md:text-[28px] font-extrabold text-slate-900 leading-none tracking-tight">
          {value}
        </h3>
        <div className="flex items-center justify-between mt-1.5 sm:mt-2 gap-1">
          <p className="text-[10px] sm:text-[11px] md:text-xs font-medium text-slate-400 truncate">
            {label}
          </p>
          <div
            className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md shrink-0 ${
              trendUp
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50"
            }`}
          >
            {trendUp ? (
              <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            )}
            {trend}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quick Action Button ──────────────────────────────── */
function QuickAction({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 md:p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md hover:border-slate-200 transition-all duration-200 group active:scale-95"
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl ${color} flex items-center justify-center transition-transform group-hover:scale-110`}
      >
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-600 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

/* ── Activity Item ────────────────────────────────────── */
function ActivityItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  time,
  isLast,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1.5" />}
      </div>
      <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        <p className="text-[10px] text-slate-300 mt-1 font-medium">{time}</p>
      </div>
    </div>
  );
}

/* ── Mock data ────────────────────────────────────────── */
const SPARK_DATA = {
  users: [120, 132, 101, 134, 190, 230, 210, 250, 270, 300, 340, 310],
  companies: [20, 25, 22, 30, 28, 35, 40, 38, 42, 45, 43, 45],
  registrations: [50, 65, 55, 80, 70, 95, 100, 85, 110, 105, 115, 110],
  revenue: [18, 20, 19, 24, 28, 30, 32, 35, 38, 40, 42, 45],
};

const RECENT_ACTIVITY = [
  {
    icon: UserPlus,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    title: '"Номин" ХХК бүртгүүлсэн',
    description: "Шинэ түншийн хүсэлт ирлээ",
    time: "5 минутын өмнө",
  },
  {
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    title: '"Э-Март" ХХК зөвшөөрөгдсөн',
    description: "Түншийн хүсэлт амжилттай батлагдсан",
    time: "23 минутын өмнө",
  },
  {
    icon: AlertCircle,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    title: "Шинэ ангилал нэмэгдсэн",
    description: '"Гоо сайхан" ангилал үүсгэсэн',
    time: "1 цагийн өмнө",
  },
  {
    icon: XCircle,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-500",
    title: '"Тест" ХХК татгалзсан',
    description: "Бүрдүүлбэр дутуу байсан тул татгалзсан",
    time: "2 цагийн өмнө",
  },
  {
    icon: FileText,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    title: "Тайлан боловсруулагдсан",
    description: "Сарын тайлан автоматаар үүссэн",
    time: "3 цагийн өмнө",
  },
];

/* ── Page ─────────────────────────────────────────────── */
const MN_WEEKDAYS = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
];
const MN_MONTHS = [
  "1-р сарын",
  "2-р сарын",
  "3-р сарын",
  "4-р сарын",
  "5-р сарын",
  "6-р сарын",
  "7-р сарын",
  "8-р сарын",
  "9-р сарын",
  "10-р сарын",
  "11-р сарын",
  "12-р сарын",
];

function formatMnDate(d: Date) {
  const weekday = MN_WEEKDAYS[d.getDay()];
  const year = d.getFullYear();
  const month = MN_MONTHS[d.getMonth()];
  const day = d.getDate();
  return `${year} оны ${month} ${day}, ${weekday} гараг`;
}

function formatMnTime(d: Date) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeRange, setActiveRange] = useState<TimeRange>("7d");
  const [currentTime, setCurrentTime] = useState(new Date());

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
            <p className="text-xs sm:text-sm font-semibold text-indigo-500">{greeting}</p>
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
            <span className="font-bold text-slate-500">
              {timeStr}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        <StatCard
          icon={Users}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
          label="Нийт хэрэглэгч"
          value="12,450"
          trend="+12.5%"
          trendUp={true}
          sparkData={SPARK_DATA.users}
        />
        <StatCard
          icon={Building2}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          label="Идэвхтэй байгууллага"
          value="45"
          trend="+3"
          trendUp={true}
          sparkData={SPARK_DATA.companies}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
          label="Шинэ бүртгэл"
          value="110"
          trend="+8.2%"
          trendUp={true}
          sparkData={SPARK_DATA.registrations}
        />
        <StatCard
          icon={Wallet}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          label="Нийт орлого"
          value="45.2M₮"
          trend="+24%"
          trendUp={true}
          sparkData={SPARK_DATA.revenue}
        />
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
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
            icon={BarChart3}
            label="Тайлан"
            color="bg-violet-500"
            onClick={() => router.push("/dashboard")}
          />
          <QuickAction
            icon={Bell}
            label="Мэдэгдэл"
            color="bg-amber-500"
            onClick={() => router.push("/dashboard")}
          />
          <QuickAction
            icon={Settings}
            label="Тохиргоо"
            color="bg-slate-500"
            onClick={() => router.push("/dashboard")}
          />
          <QuickAction
            icon={FileText}
            label="Ангилал"
            color="bg-rose-500"
            onClick={() => router.push("/categories")}
          />
        </div>
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        <RevenueChart
          data={MOCK_REVENUE_DATA[activeRange]}
          activeRange={activeRange}
          onRangeChange={setActiveRange}
        />
        <PieChart
          title="Бүртгэгдсэн байгууллагын тоо"
          total={MOCK_PIE_CHART_DATA.total}
          label={MOCK_PIE_CHART_DATA.label}
          items={MOCK_PIE_CHART_DATA.items}
        />
      </div>

      {/* ─── Bottom: Activity + Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Сүүлийн үйл ажиллагаа
              </h3>
            </div>
            <button className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors flex items-center gap-1">
              Бүгдийг харах
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div>
            {RECENT_ACTIVITY.map((item, i) => (
              <ActivityItem
                key={i}
                icon={item.icon}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
                title={item.title}
                description={item.description}
                time={item.time}
                isLast={i === RECENT_ACTIVITY.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Өнөөдрийн товч
          </h3>

          <div className="space-y-3 flex-1">
            {[
              {
                label: "Шинэ хүсэлт",
                value: 8,
                total: 20,
                color: "bg-indigo-500",
                bgColor: "bg-indigo-50",
              },
              {
                label: "Зөвшөөрсөн",
                value: 5,
                total: 8,
                color: "bg-emerald-500",
                bgColor: "bg-emerald-50",
              },
              {
                label: "Татгалзсан",
                value: 2,
                total: 8,
                color: "bg-rose-500",
                bgColor: "bg-rose-50",
              },
              {
                label: "Шинэ хэрэглэгч",
                value: 34,
                total: 50,
                color: "bg-violet-500",
                bgColor: "bg-violet-50",
              },
              {
                label: "Захиалга",
                value: 127,
                total: 200,
                color: "bg-amber-500",
                bgColor: "bg-amber-50",
              },
            ].map((item) => (
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

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-indigo-600">98%</p>
                <p className="text-[10px] font-medium text-indigo-400 mt-0.5">
                  Серверийн uptime
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold text-emerald-600">1.2s</p>
                <p className="text-[10px] font-medium text-emerald-400 mt-0.5">
                  Дундаж хариу хугацаа
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
