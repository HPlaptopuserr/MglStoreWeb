import { Badge } from "../atoms/Badge";

export interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    iconColor: string;
    iconBgColor: string;
    badgeText?: string;
    badgeVariant?: "success" | "warning" | "error" | "info" | "neutral";
}

export function MetricCard({
    title,
    value,
    icon: Icon,
    iconColor,
    iconBgColor,
    badgeText = "Live",
    badgeVariant = "success"
}: MetricCardProps) {
    return (
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${iconBgColor} ${iconColor}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {badgeText && (
                    <Badge variant={badgeVariant}>
                        {badgeText}
                    </Badge>
                )}
            </div>
            <div className="mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-extrabold text-slate-800">{value}</h3>
            </div>
        </div>
    );
}
