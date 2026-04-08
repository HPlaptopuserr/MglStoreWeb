"use client";

import { type ReactNode } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { ShieldOff } from "lucide-react";

type PermissionGateProps = {
  /** User must have at least ONE of these permissions */
  requires: string[];
  /** Fallback UI when unauthorized (defaults to a styled message) */
  fallback?: ReactNode;
  /** If true, renders nothing instead of fallback */
  silent?: boolean;
  children: ReactNode;
};

export function PermissionGate({
  requires,
  fallback,
  silent = false,
  children,
}: PermissionGateProps) {
  const { hasAnyPermission, isFullAdmin } = useAdminAuth();

  if (isFullAdmin || hasAnyPermission(...requires)) {
    return <>{children}</>;
  }

  if (silent) return null;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <ShieldOff className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">Хандах эрхгүй</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Таны роль энэ хэсэгт хандах эрхгүй байна. Ерөнхий админтай холбогдоно уу.
      </p>
    </div>
  );
}
