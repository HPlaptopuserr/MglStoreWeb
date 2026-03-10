import { LabelHTMLAttributes } from "react";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
}

export function Label({ children, className = "", required, ...props }: LabelProps) {
    return (
        <label
            className={`block text-sm font-semibold text-slate-700 mb-2 ${className}`}
            {...props}
        >
            {children}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
    );
}
