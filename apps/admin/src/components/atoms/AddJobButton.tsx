"use client";

import { Loader2 } from "lucide-react";
import React from "react";

interface AdminButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function AdminButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  className = "",
}: AdminButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none";

  const variants = {
    primary: "bg-violet-600 hover:bg-violet-700 text-white",
    secondary:
      "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
