import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", hasError = false, ...props }, ref) => {
        return (
            <input
                ref={ref}
                aria-invalid={hasError}
                className={`w-full px-4 py-3.5 bg-white border rounded-2xl focus:ring-4 outline-none transition-all text-slate-800 placeholder-slate-400 ${hasError
                        ? "border-red-300 focus:ring-red-100 focus:border-red-500"
                        : "border-slate-200 focus:ring-[#5B4CFF]/10 focus:border-[#5B4CFF]"
                    } ${className}`}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
