"use client";

import { useEffect, useId, useState } from "react";
import { Building2, CheckCircle2, Loader2, Search } from "lucide-react";
import { dispatchRequest } from "./dispatch-api";
import { dispatchControlClass } from "./DispatchRecipientFields";
import type { DispatchDestination, DispatchVendor } from "./types";

export function DispatchVendorSearch({
  warehouseId,
  value,
  onSelect,
  onManual,
}: {
  warehouseId: string;
  value: DispatchDestination;
  onSelect: (vendor: DispatchVendor) => void;
  onManual: () => void;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [vendors, setVendors] = useState<DispatchVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void dispatchRequest<{ vendors: DispatchVendor[] }>(
        `/warehouses/${encodeURIComponent(warehouseId)}/dispatch-vendors?${new URLSearchParams({ search: query.trim() })}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) setVendors(data.vendors);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : "Дэлгүүр хайж чадсангүй.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [warehouseId, query, attempt]);

  if (value.recipientOrganizationId)
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <Building2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-blue-600"
            />
            <div>
              <p className="text-sm font-bold text-blue-950">
                {value.storeName}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-blue-700">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />{" "}
                Бүртгэлтэй байгууллага сонгогдлоо
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onManual}
            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Солих
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-blue-900">
          Падан дэлгүүрийн эзэнд очно. Эзэн бараагаа тулгаж зөвшөөрсний дараа
          бүтээгдэхүүн болон үлдэгдэлд нь бүртгэгдэнэ.
        </p>
      </div>
    );

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-slate-600"
      >
        Бүртгэлтэй байгууллага / дэлгүүр хайх
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          maxLength={120}
          placeholder="Дэлгүүрийн нэр, утсаар хайх…"
          aria-describedby={`${inputId}-results`}
          onChange={(event) => {
            setQuery(event.target.value);
            setLoading(true);
            setError("");
          }}
          className={`${dispatchControlClass} mt-0 pl-10`}
        />
      </div>
      <div id={`${inputId}-results`} aria-live="polite">
        {loading ? (
          <p
            role="status"
            className="flex items-center gap-2 px-3 py-4 text-xs text-slate-500"
          >
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            Дэлгүүрүүдийг хайж байна…
          </p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"
          >
            {error}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setAttempt((current) => current + 1);
              }}
              className="ml-2 min-h-9 font-semibold underline"
            >
              Дахин оролдох
            </button>
          </div>
        ) : vendors.length ? (
          <ul className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {vendors.map((vendor) => (
              <li key={vendor.id}>
                <button
                  type="button"
                  onClick={() => onSelect(vendor)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-slate-900">
                      {vendor.name}
                    </span>
                    <span className="mt-1 block break-words text-xs text-slate-500">
                      {[vendor.contactName, vendor.contactPhone, vendor.address]
                        .filter(Boolean)
                        .join(" · ") || "Бүртгэлтэй дэлгүүр"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-blue-600">
                    Сонгох
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-xs leading-5 text-slate-500">
            Тохирох дэлгүүр олдсонгүй. Хайлтаа өөрчилж үзнэ үү. Бүртгэлгүй
            дэлгүүрийн мэдээллийг доор гараар оруулж болно.
          </p>
        )}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Бүртгэлгүй дэлгүүрт гаргах бол доорх мэдээллийг гараар бөглөнө.
      </p>
    </div>
  );
}
