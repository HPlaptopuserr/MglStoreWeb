export interface BadgeProps {
    children: React.ReactNode;
    variant?: "success" | "warning" | "error" | "info" | "neutral";
    className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
    let variantStyles = "";

    switch (variant) {
        case "success":
            variantStyles = "text-emerald-500 bg-emerald-50";
            break;
        case "warning":
            variantStyles = "text-orange-500 bg-orange-50";
            break;
        case "error":
            variantStyles = "text-red-500 bg-red-50";
            break;
        case "info":
            variantStyles = "text-[#5B4CFF] bg-[#5B4CFF]/10";
            break;
        case "neutral":
        default:
            variantStyles = "text-slate-600 bg-slate-100";
            break;
    }

    return (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${variantStyles} ${className}`}>
            {children}
        </span>
    );
}
