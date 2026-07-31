"use client";

import { useMemo, useState } from "react";
import { Loader2, Truck, UserRound, X } from "lucide-react";
import type {
  DeliveryAssignmentPartnership,
  OnlineOrder,
} from "./online-order.types";

interface DeliveryAssignmentDialogProps {
  order: OnlineOrder;
  partnerships: DeliveryAssignmentPartnership[];
  loading: boolean;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (partnershipId: string, courierId: string) => Promise<void>;
}

export function DeliveryAssignmentDialog({
  order,
  partnerships,
  loading,
  submitting,
  error,
  onClose,
  onSubmit,
}: DeliveryAssignmentDialogProps) {
  const [partnershipId, setPartnershipId] = useState(
    order.delivery?.partnershipId || "",
  );
  const selectedPartnership = useMemo(
    () => partnerships.find((item) => item.id === partnershipId),
    [partnershipId, partnerships],
  );
  const [courierId, setCourierId] = useState(
    order.delivery?.courier?.id || "",
  );
  const canSubmit = Boolean(partnershipId && courierId && !submitting);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-assignment-title"
        className="w-full rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Truck size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Цонх хаах"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <h2
          id="delivery-assignment-title"
          className="mt-5 text-xl font-black text-slate-950"
        >
          Хүргэлт хуваарилах
        </h2>
        <p className="mt-1 font-mono text-xs font-bold text-slate-500">
          #{order.orderNumber}
        </p>

        {loading ? (
          <div className="flex h-36 items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : partnerships.length === 0 ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Идэвхтэй хүргэлтийн компани алга. “Хүргэлтийн сүлжээ” хэсгээс
            хамтын ажиллагаа үүсгэж, хүргэгч бүртгэнэ үү.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">
                Хүргэлтийн компани
              </span>
              <select
                value={partnershipId}
                onChange={(event) => {
                  setPartnershipId(event.target.value);
                  setCourierId("");
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Компани сонгох</option>
                {partnerships.map((partnership) => (
                  <option key={partnership.id} value={partnership.id}>
                    {partnership.provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
                <UserRound size={15} />
                Хүргэгч
              </span>
              <select
                value={courierId}
                disabled={!selectedPartnership}
                onChange={(event) => setCourierId(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">Хүргэгч сонгох</option>
                {selectedPartnership?.couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.profile?.fullName || courier.email}
                    {courier.profile?.phoneNumber
                      ? ` · ${courier.profile.phoneNumber}`
                      : ""}
                  </option>
                ))}
              </select>
              {selectedPartnership?.couriers.length === 0 && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Энэ компаниас агуулахад бүртгэсэн хүргэгч алга.
                </p>
              )}
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Болих
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit(partnershipId, courierId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Хуваарилах
          </button>
        </div>
      </div>
    </div>
  );
}
