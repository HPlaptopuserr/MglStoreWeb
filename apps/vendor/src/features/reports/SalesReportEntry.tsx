"use client";

import { useEffect, useState } from "react";
import { API, authFetch } from "@/lib/api";
import { SalesReportPanel } from "./SalesReportPanel";
interface Branch {
  id: string;
  name: string;
}
export function SalesReportEntry({
  organizationId,
  range,
  onRangeChange,
}: {
  organizationId: string;
  range: { start: string; end: string };
  onRangeChange: (range: { start: string; end: string }) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Зарагдсан барааны дэлгэрэнгүй
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Бараа бүрээр · Зарсан ажилтан, огноо, төлбөрийн хэлбэр
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
      {branchId && !loading && (
        <SalesReportPanel
          key={branchId}
          branchId={branchId}
          range={range}
          onRangeChange={onRangeChange}
        />
      )}
    </section>
  );
}
