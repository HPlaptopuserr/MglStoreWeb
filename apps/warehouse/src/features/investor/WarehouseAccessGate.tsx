"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LogOut, Loader2 } from "lucide-react";
import { useWarehouseScope } from "@/features/warehouse-scope/WarehouseScopeProvider";

export function WarehouseAccessGate({
  children,
  viewerContent,
  userName,
  onSignOut,
}: {
  children: ReactNode;
  viewerContent: ReactNode;
  userName: string;
  onSignOut: () => void;
}) {
  const scope = useWarehouseScope();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (
      !scope.isLoading &&
      !scope.error &&
      scope.viewerOnly &&
      pathname !== "/investor"
    )
      router.replace("/investor");
  }, [scope.isLoading, scope.error, scope.viewerOnly, pathname, router]);
  if (scope.isLoading)
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-slate-600"
      >
        <Loader2 className="size-5 animate-spin" />
        Хандах эрхийг шалгаж байна…
      </div>
    );
  if (scope.error)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert">{scope.error}</p>
        <button
          onClick={() => void scope.refreshWarehouses()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
        >
          Дахин оролдох
        </button>
        <button
          onClick={onSignOut}
          className="text-sm text-slate-600 hover:underline"
        >
          Гарах
        </button>
      </div>
    );
  if (!scope.viewerOnly) return children;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Eye className="size-5" />
            </span>
            <div>
              <p className="font-bold">Дундын дэлгүүр</p>
              <p className="text-xs text-slate-500">
                Хөрөнгө оруулагч · Зөвхөн харах эрх
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{userName}</span>
            <button
              onClick={onSignOut}
              aria-label="Гарах"
              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        {pathname === "/investor" ? (
          viewerContent
        ) : (
          <p role="status">Тайлан руу шилжиж байна…</p>
        )}
      </main>
    </div>
  );
}
