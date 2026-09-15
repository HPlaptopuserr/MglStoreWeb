"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

type Reservation = {
  requestId: string;
  requestNumber: string;
  quantity: number;
  status: "PENDING" | "APPROVED" | "PROCESSING";
  requestedAt: string;
  organization: { id: string; name: string };
  dispatch: {
    id: string;
    dispatchNumber: string;
    status: string;
  } | null;
};

type ReservationBreakdown = {
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  reservations: Reservation[];
};

const statusLabels: Record<Reservation["status"], string> = {
  PENDING: "Хүлээгдэж буй",
  APPROVED: "Баталгаажсан",
  PROCESSING: "Бэлтгэж буй",
};

export function StockReservationBreakdown({
  warehouseId,
  productId,
}: {
  warehouseId: string;
  productId: string;
}) {
  const [data, setData] = useState<ReservationBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void wmsFetch(
      `${API}/stock-requests/warehouse/${warehouseId}/products/${productId}/reservations`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            payload?.message || "Захиалгын задаргаа авахад алдаа гарлаа",
          );
        }
        return response.json() as Promise<ReservationBreakdown>;
      })
      .then(setData)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Захиалгын задаргаа авахад алдаа гарлаа",
          );
        }
      });

    return () => controller.abort();
  }, [productId, warehouseId]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Захиалгын үлдэгдлийг шалгаж байна…
      </div>
    );
  }

  return (
    <section
      className="space-y-4 border-t border-slate-100 pt-6"
      aria-labelledby="reservation-title"
    >
      <div>
        <h3 id="reservation-title" className="font-semibold text-slate-900">
          Нөөцийн задаргаа
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Гар дээрх үлдэгдлээс идэвхтэй хүсэлтэд орсон тоог хасаж захиалж болох
          тоог гаргав.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StockMetric label="Гар дээр" value={data.physicalStock} tone="slate" />
        <StockMetric
          label="Захиалгад орсон"
          value={data.reservedStock}
          tone="amber"
        />
        <StockMetric
          label="Захиалж болох"
          value={data.availableStock}
          tone="emerald"
        />
      </div>

      {data.reservations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">
          Энэ бараанд идэвхтэй хүсэлт алга.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <ClipboardList className="h-4 w-4" />
            Хүсэлтүүд ({data.reservations.length})
          </div>
          <ul className="divide-y divide-slate-100">
            {data.reservations.map((reservation) => (
              <li
                key={reservation.requestId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold text-blue-700">
                    {reservation.requestNumber}
                  </p>
                  <p className="truncate text-sm text-slate-700">
                    {reservation.organization.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {statusLabels[reservation.status]} ·{" "}
                    {new Date(reservation.requestedAt).toLocaleDateString(
                      "mn-MN",
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold text-amber-700">
                    {reservation.quantity}
                  </p>
                  <p className="text-xs text-slate-500">ширхэг</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StockMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "emerald";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}
