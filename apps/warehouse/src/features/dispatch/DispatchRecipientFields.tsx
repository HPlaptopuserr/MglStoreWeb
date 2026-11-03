"use client";
import type { DispatchDestination } from "./types";

export const dispatchControlClass =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";
export function DispatchRecipientFields({
  value,
  update,
  onManualStore,
}: {
  value: DispatchDestination;
  update: (patch: Partial<DispatchDestination>) => void;
  onManualStore: () => void;
}) {
  const control = dispatchControlClass;
  return (
    <>
      {" "}
      <label className="block text-xs font-semibold text-slate-600">
        Дэлгүүрийн нэр <span className="text-red-500">*</span>
        <input
          required
          value={value.storeName}
          maxLength={160}
          onChange={(event) => {
            onManualStore();
            update({ storeName: event.target.value });
          }}
          placeholder="Хүлээн авах дэлгүүрийн нэр"
          className={control}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">
          Хүлээн авагчийн нэр <span className="text-red-500">*</span>
          <input
            required
            autoComplete="name"
            value={value.recipientName}
            maxLength={160}
            onChange={(event) => update({ recipientName: event.target.value })}
            placeholder="Овог, нэр"
            className={control}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Утасны дугаар <span className="text-red-500">*</span>
          <input
            required
            type="tel"
            autoComplete="tel"
            value={value.recipientPhone}
            maxLength={40}
            onChange={(event) => update({ recipientPhone: event.target.value })}
            placeholder="99112233"
            className={control}
          />
        </label>
      </div>
    </>
  );
}
