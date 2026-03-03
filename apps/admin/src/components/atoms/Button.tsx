import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    icon?: ReactNode;
    variant?: "primary" | "secondary" | "danger" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            className = "",
            isLoading = false,
            loadingText,
            icon,
            variant = "primary",
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles = "w-full flex justify-center items-center gap-2 px-4 py-3.5 rounded-2xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm";

        let variantStyles = "";
        switch (variant) {
            case "primary":
                variantStyles = "bg-[#5B4CFF] hover:bg-[#4E41DE] focus:ring-4 focus:ring-[#5B4CFF]/30 text-white";
                break;
            case "secondary":
                variantStyles = "bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-4 focus:ring-slate-200";
                break;
            case "danger":
                variantStyles = "bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-200 text-white";
                break;
            case "ghost":
                variantStyles = "bg-transparent shadow-none hover:bg-slate-50 text-slate-700";
                break;
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                className={`${baseStyles} ${variantStyles} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" aria-hidden="true" />
                ) : icon ? (
                    icon
                ) : null}
                {isLoading && loadingText ? loadingText : children}
            </button>
        );
    }
);

Button.displayName = "Button";
