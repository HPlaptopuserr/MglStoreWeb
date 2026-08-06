"use client";

import { useCallback, useEffect, useState } from "react";
import { API, wmsFetch } from "@/lib/api";

type PendingStockRequest = {
  id: string;
  requestNumber: string;
  note: string | null;
  requestedAt: string;
  organization?: { name?: string };
};

type PendingRequestsProps = {
  warehouseId?: string;
};

export function PendingRequests({ warehouseId }: PendingRequestsProps) {
  const [requests, setRequests] = useState<PendingStockRequest[]>([]);

  const load = useCallback(async () => {
    if (!warehouseId) {
      setRequests([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        status: "PENDING",
        warehouseId,
      });
      const res = await wmsFetch(`${API}/stock-requests?${params}`);
      if (!res.ok) return;

      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        setRequests([]);
        return;
      }
      const pending = data as PendingStockRequest[];
      setRequests(
        pending.sort((left, right) => {
          const leftIsSalesRequest =
            left.requestNumber.startsWith("SR-") ||
            left.note?.startsWith("[Х/Т захиалга]");
          const rightIsSalesRequest =
            right.requestNumber.startsWith("SR-") ||
            right.note?.startsWith("[Х/Т захиалга]");
          return (
            Number(rightIsSalesRequest) - Number(leftIsSalesRequest) ||
            new Date(right.requestedAt).getTime() -
              new Date(left.requestedAt).getTime()
          );
        }),
      );
    } catch {
      // Keep the previous successful result during transient refresh failures.
    }
  }, [warehouseId]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  if (requests.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          Хүлээгдэж буй хүсэлтүүд
        </h2>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
          {requests.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="pb-2 pr-4 font-semibold">Дугаар</th>
              <th className="pb-2 pr-4 font-semibold">Байгууллага</th>
              <th className="pb-2 pr-4 font-semibold">Огноо</th>
              <th className="pb-2 font-semibold">Төлөв</th>
            </tr>
          </thead>
          <tbody>
            {requests.slice(0, 10).map((req) => (
              <tr
                key={req.id}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="py-2.5 pr-4 font-medium text-blue-600">
                  #{req.requestNumber}
                  {(req.requestNumber.startsWith("SR-") ||
                    req.note?.startsWith("[Х/Т захиалга]")) && (
                    <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      Х/Т
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-slate-600">
                  {req.organization?.name || "—"}
                </td>
                <td className="py-2.5 pr-4 text-slate-500">
                  {new Date(req.requestedAt).toLocaleDateString("mn-MN")}
                </td>
                <td className="py-2.5">
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    Хүлээгдэж буй
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
