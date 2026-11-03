"use client";

import { InvestorViewerHeader } from "./InvestorViewerHeader";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
      !["/investor", "/investor/profile"].includes(pathname)
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
      <InvestorViewerHeader userName={userName} onSignOut={onSignOut} />
      <main className="mx-auto max-w-7xl p-4 sm:p-8">
        {["/investor", "/investor/profile"].includes(pathname) ? (
          viewerContent
        ) : (
          <p role="status">Тайлан руу шилжиж байна…</p>
        )}
      </main>
    </div>
  );
}
