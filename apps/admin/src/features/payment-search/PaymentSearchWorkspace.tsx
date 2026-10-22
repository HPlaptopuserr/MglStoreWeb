"use client";

import { useAdminAuth } from "@/lib/admin-auth";
import { PaymentSearchForm } from "./PaymentSearchForm";
import { PaymentSearchResults } from "./PaymentSearchResults";
import { usePaymentSearch } from "./usePaymentSearch";

export function PaymentSearchWorkspace() {
  const { isReady, isFullAdmin } = useAdminAuth();
  const { result, loading, error, search, goToPage } = usePaymentSearch();
  if (!isReady) return <p role="status">Ачаалж байна…</p>;
  if (!isFullAdmin)
    return (
      <p role="alert" className="text-sm text-red-700">
        Төлбөр хайхад админ эрх шаардлагатай.
      </p>
    );
  return (
    <div className="space-y-6">
      <PaymentSearchForm loading={loading} onSearch={search} />
      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <p role="status" className="py-6 text-center text-sm text-slate-500">
            Төлбөрийн бүртгэлээс хайж байна…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {result && <PaymentSearchResults result={result} onPage={goToPage} />}
        {!loading && !error && !result && (
          <p className="py-6 text-center text-sm text-slate-500">
            Онлайн захиалгын төлбөрөөс захиалагч, утас, дэлгүүрийг хайна.
          </p>
        )}
      </div>
    </div>
  );
}
