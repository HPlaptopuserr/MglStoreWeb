import {
    Users,
    BookOpen,
    TrendingUp,
    LineChart,
} from "lucide-react";
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
    realIncome = "0.00M₮"
}: DashboardMetricsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                title="bla2"
                value={totalStudents}
                icon={Users}
                iconColor="text-[#5B4CFF]"
                iconBgColor="bg-[#5B4CFF]/10"
            />
            <MetricCard
                title="ИДЭВХТЭЙ КУРСУУД"
                value={activeCourses}
                icon={BookOpen}
                iconColor="text-orange-500"
                iconBgColor="bg-orange-50"
            />
            <MetricCard
                title="БҮРТГЭЛТЭЙ"
                value={registered}
                icon={TrendingUp}
                iconColor="text-red-500"
                iconBgColor="bg-red-50"
            />
            <MetricCard
                title="БОДИТ ОРЛОГО"
                value={realIncome}
                icon={LineChart}
                iconColor="text-emerald-500"
                iconBgColor="bg-emerald-50"
            />
        </div>
    );
}
