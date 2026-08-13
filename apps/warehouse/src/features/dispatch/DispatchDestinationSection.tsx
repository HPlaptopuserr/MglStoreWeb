"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  UserRound,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import type {
  DispatchAddressSuggestion,
  DispatchDestination,
  DispatchStore,
} from "./types";

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

interface StoreLocationResponse {
  id?: unknown;
  name?: unknown;
  address?: unknown;
  lat?: unknown;
  lng?: unknown;
  organization?: {
    id?: unknown;
    name?: unknown;
  };
}

function normalizeStore(value: StoreLocationResponse): DispatchStore | null {
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.lat !== "number" ||
    !Number.isFinite(value.lat) ||
    typeof value.lng !== "number" ||
    !Number.isFinite(value.lng) ||
    typeof value.organization?.id !== "string" ||
    typeof value.organization.name !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    address: typeof value.address === "string" ? value.address : null,
    lat: value.lat,
    lng: value.lng,
    organization: {
      id: value.organization.id,
      name: value.organization.name,
    },
  };
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
  const [stores, setStores] = useState<DispatchStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loadingStores, setLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState("");
  const selectedStore = stores.find((store) => store.id === selectedStoreId);

  useEffect(() => {
    if (value.lat === null || value.lng === null) setSelectedStoreId(null);
  }, [value.lat, value.lng]);

  useEffect(() => {
    const controller = new AbortController();
    const loadStores = async () => {
      setLoadingStores(true);
      setStoreError("");
      try {
        const response = await wmsFetch(`${API}/store/branches`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("STORE_LOAD_FAILED");
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("INVALID_STORE_RESPONSE");
        setStores(
          payload
            .map((item) => normalizeStore(item as StoreLocationResponse))
            .filter((item): item is DispatchStore => item !== null),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStores([]);
        setStoreError("Дэлгүүрийн байршлуудыг ачаалж чадсангүй");
      } finally {
        if (!controller.signal.aborted) setLoadingStores(false);
      }
    };
    void loadStores();
    return () => controller.abort();
  }, []);

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
    setSelectedStoreId(null);
    update({
      address: suggestion.address,
      recipientName: suggestion.recipientName ?? value.recipientName,
      recipientPhone: suggestion.recipientPhone ?? value.recipientPhone,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setShowSuggestions(false);
  };

  const selectStore = (store: DispatchStore) => {
    setSelectedStoreId(store.id);
    update({
      address:
        store.address?.trim() || `${store.organization.name} · ${store.name}`,
      recipientName: `${store.organization.name} · ${store.name}`,
      lat: store.lat,
      lng: store.lng,
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-600/30">
              1
            </span>
            <div>
              <h2 className="font-bold text-slate-950">
                Хүргэх байршил сонгох
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Дэлгүүр сонгох эсвэл газрын зураг дээр хүргэх цэгээ тэмдэглэнэ.
              </p>
            </div>
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

      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="dispatch-store"
            className="shrink-0 text-xs font-semibold text-slate-600"
          >
            Хүлээн авах дэлгүүр
          </label>
          <div className="relative min-w-0 flex-1 sm:min-w-64">
            <select
              id="dispatch-store"
              value={selectedStoreId ?? ""}
              onChange={(event) => {
                const store = stores.find(
                  (item) => item.id === event.target.value,
                );
                if (store) selectStore(store);
              }}
              disabled={loadingStores || stores.length === 0}
              className="h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-9 text-sm font-medium outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 disabled:opacity-60"
            >
              <option value="">
                {loadingStores
                  ? "Дэлгүүрүүд ачаалж байна..."
                  : stores.length > 0
                    ? `${stores.length} дэлгүүрээс сонгох`
                    : "Координаттай дэлгүүр алга"}
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.organization.name} · {store.name}
                </option>
              ))}
            </select>
            {loadingStores && (
              <Loader2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />
            )}
          </div>
          {!loadingStores && stores.length > 0 && (
            <span className="text-xs text-slate-500">
              Эсвэл map дээрх улбар шар цэгийг дарна уу
            </span>
          )}
        </div>
        {storeError && (
          <p
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {storeError}
          </p>
        )}
        {selectedStore && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Хүлээн авагч сонгогдлоо
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {selectedStore.organization.name} · {selectedStore.name}
              </p>
              {selectedStore.address && (
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {selectedStore.address}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative min-h-64 bg-slate-100">
        <DispatchLocationPicker
          lat={value.lat}
          lng={value.lng}
          stores={stores}
          selectedStoreId={selectedStoreId}
          onChange={(lat, lng) => {
            setSelectedStoreId(null);
            update({ lat, lng });
          }}
          onSelectStore={selectStore}
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
