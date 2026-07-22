import type { TimeRange } from "@/components/organisms/RevenueChart";

export interface RevenueChartPoint {
    name: string;
    fullDate: string;
    leads: number;
    revenue: number;
    isCurrent: boolean;
}

const generateChartData = (
    days: number,
    points: number,
    startRevenue: number,
): RevenueChartPoint[] => {
    const data: RevenueChartPoint[] = [];
    const today = new Date();

    let currentLeads = 200;
    let currentRevenue = startRevenue;

    const msPerPoint = (days * 24 * 60 * 60 * 1000) / Math.max(1, points - 1);

    for (let i = points - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * msPerPoint);

        currentLeads = Math.max(50, currentLeads + (Math.random() * 40 - 20));
        currentRevenue = Math.max(0, currentRevenue + (Math.random() * 800 - 400));

        const month = d.toLocaleDateString("mn-MN", { month: "short" });
        const day = d.getDate();

        let nameFormat = "";
        if (days <= 7) {
            nameFormat = `${day}-нд ${d.getHours()}ц`;
        } else {
            nameFormat = `${month} ${day}`;
        }

        data.push({
            name: nameFormat,
            fullDate: `${month} ${day}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
            leads: Math.round(currentLeads),
            revenue: Math.round(currentRevenue),
            isCurrent: i === 0,
        });
    }

    return data;
};

export const MOCK_REVENUE_DATA: Record<TimeRange, RevenueChartPoint[]> = {
    "7d": generateChartData(7, 42, 2000),
    "30d": generateChartData(30, 30, 15000),
    "6m": generateChartData(180, 60, 50000),
    "1y": generateChartData(365, 70, 120000),
    "all": generateChartData(730, 80, 200000),
};

export const MOCK_DASHBOARD_METRICS = {
    totalStudents: 12450,
    activeCourses: 45,
    registered: 110,
    realIncome: "45.2M₮",
};

export const MOCK_PIE_CHART_DATA = {
    total: 342,
    label: "нийт шинэ",
    items: [
        { label: "Шинэ Хүсэлт", colorClass: "bg-orange-400" },
        { label: "Хүлээж авсан", colorClass: "bg-green-400" },
        { label: "Хүлээж авагүй", colorClass: "bg-red-400" },
        { label: "Буцаасан", colorClass: "bg-blue-400" },
    ]
};
