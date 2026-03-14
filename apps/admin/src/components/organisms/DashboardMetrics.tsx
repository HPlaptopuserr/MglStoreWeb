import { Users, Building2, TrendingUp, Wallet } from "lucide-react";
import { MetricCard } from "../molecules/MetricCard";

export interface DashboardMetricsProps {
  totalStudents?: number;
  activeCourses?: number;
  registered?: number;
  realIncome?: string;
}

export function DashboardMetrics({
  totalStudents = 1,
  activeCourses = 2,
  registered = 0,
  realIncome = "0.00M₮",
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <MetricCard
        title="Нийт хэрэглэгч"
        value={totalStudents.toLocaleString()}
        icon={Users}
        iconColor="text-[#5B4CFF]"
        iconBgColor="bg-[#5B4CFF]/10"
        trend="+12%"
        trendUp={true}
      />
      <MetricCard
        title="Идэвхтэй байгууллага"
        value={activeCourses}
        icon={Building2}
        iconColor="text-orange-500"
        iconBgColor="bg-orange-50"
        trend="+3"
        trendUp={true}
      />
      <MetricCard
        title="Шинэ бүртгэл"
        value={registered}
        icon={TrendingUp}
        iconColor="text-violet-500"
        iconBgColor="bg-violet-50"
        trend="+8%"
        trendUp={true}
      />
      <MetricCard
        title="Нийт орлого"
        value={realIncome}
        icon={Wallet}
        iconColor="text-emerald-500"
        iconBgColor="bg-emerald-50"
        trend="+24%"
        trendUp={true}
      />
    </div>
  );
}
