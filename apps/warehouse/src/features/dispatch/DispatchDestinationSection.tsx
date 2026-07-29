"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  UserRound,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import type { DispatchAddressSuggestion, DispatchDestination } from "./types";

const DispatchLocationPicker = dynamic(
  () =>
    import("./DispatchLocationPicker").then(
      (module) => module.DispatchLocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-72 items-center justify-center bg-slate-50 text-sm text-slate-500">
        Газрын зураг ачаалж байна...
      </div>
    ),
  },
);

interface DispatchDestinationSectionProps {
  warehouseId: string;
  value: DispatchDestination;
  onChange: (value: DispatchDestination) => void;
}

export function DispatchDestinationSection({
  warehouseId,
  value,
  onChange,
}: DispatchDestinationSectionProps) {
  const [suggestions, setSuggestions] = useState<DispatchAddressSuggestion[]>(
    [],
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!warehouseId) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const params = new URLSearchParams({ limit: "8" });
        if (value.address.trim()) params.set("query", value.address.trim());
        const response = await wmsFetch(
          `${API}/warehouses/${warehouseId}/dispatch-addresses?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data: unknown = await response.json();
        setSuggestions(
          Array.isArray(data) ? (data as DispatchAddressSuggestion[]) : [],
        );
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [warehouseId, value.address]);

  const update = (patch: Partial<DispatchDestination>) => {
    onChange({ ...value, ...patch });
  };

  const selectSuggestion = (suggestion: DispatchAddressSuggestion) => {
    update({
      address: suggestion.address,
      recipientName: suggestion.recipientName ?? value.recipientName,
      recipientPhone: suggestion.recipientPhone ?? value.recipientPhone,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setShowSuggestions(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="h-1 w-1 rounded-full bg-blue-600" />
              Хүргэх байршил
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Хаягаа бичээд газрын зураг дээр яг хүргэх цэгийг тэмдэглэнэ.
            </p>
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" />
            {locating ? "Байршил авч байна..." : "Одоогийн байршил"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Хүлээн авагч
            </span>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={value.recipientName}
                onChange={(event) =>
                  update({ recipientName: event.target.value })
                }
                maxLength={160}
                placeholder="Нэр эсвэл байгууллага"
                className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Утас
            </span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={value.recipientPhone}
                onChange={(event) =>
                  update({ recipientPhone: event.target.value })
                }
                maxLength={40}
                inputMode="tel"
                placeholder="9911 2233"
                className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Дэлгэрэнгүй хаяг <span className="text-red-500">*</span>
          </span>
          <div className="relative">
            <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={value.address}
              onFocus={() => setShowSuggestions(true)}
              onChange={(event) => {
                update({ address: event.target.value });
                setShowSuggestions(true);
              }}
              maxLength={500}
              autoComplete="street-address"
              placeholder="Дүүрэг, хороо, байр, орц, тоот..."
              className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {loadingSuggestions && (
              <Clock3 className="absolute right-3 top-3.5 h-4 w-4 animate-pulse text-blue-500" />
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-[1001] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Өмнө ашигласан хаяг
                </div>
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={`${suggestion.address}-${suggestion.lastUsedAt}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-start gap-3 border-b border-slate-50 px-3 py-3 text-left transition last:border-0 hover:bg-blue-50"
                  >
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {suggestion.address}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {[suggestion.recipientName, suggestion.recipientPhone]
                          .filter(Boolean)
                          .join(" · ") || "Өмнөх гаргалт"}
                        {suggestion.lat === null &&
                          " · Цэгийг дахин тэмдэглэнэ"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="relative min-h-72 bg-slate-100">
        <DispatchLocationPicker
          lat={value.lat}
          lng={value.lng}
          onChange={(lat, lng) => update({ lat, lng })}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur">
          <Navigation className="mr-1.5 inline h-3.5 w-3.5 text-blue-600" />
          {value.lat !== null && value.lng !== null
            ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
            : "Газрын зураг дээр дарж цэг сонгоно уу"}
        </div>
      </div>
    </section>
  );
}
