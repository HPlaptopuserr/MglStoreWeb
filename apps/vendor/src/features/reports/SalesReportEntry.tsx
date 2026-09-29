"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { API, authFetch } from "@/lib/api";
const SalesReportDialog = dynamic(
  () =>
    import("@/features/pos/components/SalesReportDialog").then(
      (module) => module.SalesReportDialog,
    ),
  { ssr: false },
);
interface Branch {
  id: string;
  name: string;
}
export function SalesReportEntry({
  organizationId,
}: {
  organizationId: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOpen(false);
    setBranches([]);
    setBranchId("");
    setError("");
    if (!organizationId) return () => controller.abort();
    setLoading(true);
    async function load() {
      try {
        const response = await authFetch(
          `${API}/admin/branches?organizationId=${encodeURIComponent(organizationId)}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error("Салбарын жагсаалт ачаалж чадсангүй.");
        const rows: Branch[] = await response.json();
        if (!controller.signal.aborted) {
          setBranches(rows);
          setBranchId(rows[0]?.id ?? "");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [organizationId, revision]);
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Борлуулалтын дэлгэрэнгүй тайлан
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Өдөр, ажилтнаар шүүх · Бараа, баримт, төлбөрийн Excel тайлан
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Тайлангийн салбар"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            disabled={loading}
            className="h-10 max-w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">
              {loading ? "Ачаалж байна…" : "Салбар сонгох"}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!branchId || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Тайлан нээх
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            className="underline"
          >
            Дахин оролдох
          </button>
        </p>
      )}
      {!loading && !error && organizationId && !branches.length && (
        <p className="mt-2 text-sm text-slate-500">
          Бүртгэлтэй салбар байхгүй байна.
        </p>
      )}
      {open && branchId && (
        <SalesReportDialog branchId={branchId} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
