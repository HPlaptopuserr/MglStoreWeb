import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export interface AlertMessageProps {
    message: string;
    type?: "error" | "success" | "info";
    className?: string;
}

export function AlertMessage({ message, type = "error", className = "" }: AlertMessageProps) {
    if (!message) return null;

    let styles = "";
    let Icon = AlertCircle;

    switch (type) {
        case "error":
            styles = "bg-red-50 text-red-600 border-red-100";
            Icon = AlertCircle;
            break;
        case "success":
            styles = "bg-green-50 text-green-600 border-green-100";
            Icon = CheckCircle2;
            break;
        case "info":
            styles = "bg-blue-50 text-blue-600 border-blue-100";
            Icon = Info;
            break;
    }

    return (
        <div
            className={`p-4 text-sm rounded-2xl flex items-center gap-2 border ${styles} ${className}`}
            role="alert"
            aria-live="assertive"
        >
            <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">{message}</span>
        </div>
    );
}
