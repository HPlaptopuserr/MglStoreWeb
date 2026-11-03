import type { ButtonHTMLAttributes } from "react";

interface PlanIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function PlanIconButton({
  label,
  className = "",
  children,
  ...props
}: PlanIconButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={`plan-icon-button ${className}`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
