"use client";

import { useEffect, useState } from "react";
import { API, wmsFetch } from "@/lib/api";

export function PendingRequests() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await wmsFetch(`${API}/stock-requests?status=PENDING`);
        if (res.ok) {
          const data = await res.json();
          setRequests(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

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
            {requests.map((req) => (
              <tr
                key={req.id}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="py-2.5 pr-4 font-medium text-blue-600">
                  #{req.requestNumber}
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
