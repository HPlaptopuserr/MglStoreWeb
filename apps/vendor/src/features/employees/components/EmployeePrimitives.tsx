import { AlertCircle, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function EmployeeButton({
  variant = "primary",
  busy = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
}) {
  const colors = {
    primary:
      "border-transparent bg-blue-600 text-white shadow-sm shadow-blue-600/15 hover:bg-blue-700",
    secondary:
      "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    danger: "border-transparent bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]} ${className}`}
    >
      {busy && (
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

export function EmployeeAvatar({
  name,
  muted = false,
}: {
  name: string;
  muted?: boolean;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ring-1 ring-inset ${muted ? "bg-slate-100 text-slate-500 ring-slate-200/70" : "bg-indigo-50 text-indigo-600 ring-indigo-100"}`}
    >
      {initials}
    </span>
  );
}

export function EmployeeAlert({
  children,
  retry,
}: {
  children: ReactNode;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {children}
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="ml-2 font-semibold underline underline-offset-4 focus-visible:outline-2"
          >
            Дахин оролдох
          </button>
        )}
      </div>
    </div>
  );
}
