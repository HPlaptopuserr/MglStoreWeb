"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { MapPin, X } from "lucide-react";
import type { DispatchDestination, DispatchStore } from "./types";
import { useDispatchDestinations } from "./useDispatchDestinations";
import { DispatchMapSection } from "./DispatchMapSection";
import {
  DispatchRecipientFields,
  dispatchControlClass as control,
} from "./DispatchRecipientFields";

export function DispatchDestinationSection({
  warehouseId,
  value,
  onChange,
}: {
  warehouseId: string;
  value: DispatchDestination;
  onChange: Dispatch<SetStateAction<DispatchDestination>>;
}) {
  const state = useDispatchDestinations(warehouseId, value.address);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const update = (patch: Partial<DispatchDestination>) =>
    onChange((current) => ({ ...current, ...patch }));
  const selectStore = (store: DispatchStore) => {
    setSelectedStoreId(store.id);
    update({
      storeName: `${store.organization.name} · ${store.name}`,
      recipientName: store.contactName ?? value.recipientName,
      recipientPhone: store.contactPhone ?? value.recipientPhone,
      address: store.address ?? "",
      lat: store.lat,
      lng: store.lng,
    });
    setShowSuggestions(false);
  };
  const hasPin = value.lat !== null && value.lng !== null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            2
          </span>
          <div>
            <h2 className="font-bold text-slate-950">
              Хүлээн авагчийн мэдээлэл
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Дэлгүүрээ сонгох эсвэл нэр, утсыг гараар оруулна. Хаяг болон
              газрын зургийн pin сонголттой.
            </p>
          </div>
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Бүртгэлтэй дэлгүүрээс сонгох
          <select
            value={selectedStoreId ?? ""}
            disabled={state.loadingStores}
            onChange={(event) => {
              const store = state.stores.find(
                (item) => item.id === event.target.value,
              );
              if (store) selectStore(store);
              else setSelectedStoreId(null);
            }}
            className={control}
          >
            <option value="">
              {state.loadingStores
                ? "Дэлгүүрүүд ачаалж байна…"
                : "Бүртгэлгүй дэлгүүр / гараар оруулах"}
            </option>
            {state.stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.organization.name} · {store.name}
              </option>
            ))}
          </select>
        </label>
        {state.storeError && (
          <div
            role="alert"
            className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"
          >
            {state.storeError} · Мэдээллээ гараар оруулж болно.
            <button
              type="button"
              onClick={state.reload}
              className="ml-2 min-h-9 font-semibold underline"
            >
              Дахин ачаалах
            </button>
          </div>
        )}
        <DispatchRecipientFields
          value={value}
          update={update}
          onManualStore={() => setSelectedStoreId(null)}
        />
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-600">
            Хаяг{" "}
            <span className="font-normal text-slate-400">· сонголттой</span>
            <input
              value={value.address}
              maxLength={500}
              onFocus={() => setShowSuggestions(true)}
              onChange={(event) => {
                update({ address: event.target.value });
                setShowSuggestions(true);
              }}
              placeholder="Дүүрэг, хороо, байр, тоот…"
              className={control}
            />
          </label>
          {showSuggestions && state.suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <p className="px-2 py-1 text-xs font-semibold text-slate-400">
                Өмнө ашигласан хаяг
              </p>
              {state.suggestions.map((suggestion) => (
                <button
                  key={suggestion.address}
                  type="button"
                  onClick={() => {
                    update({
                      storeName: suggestion.storeName ?? value.storeName,
                      address: suggestion.address,
                      recipientName:
                        suggestion.recipientName ?? value.recipientName,
                      recipientPhone:
                        suggestion.recipientPhone ?? value.recipientPhone,
                      lat: suggestion.lat,
                      lng: suggestion.lng,
                    });
                    setSelectedStoreId(null);
                    setShowSuggestions(false);
                  }}
                  className="block min-h-11 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-blue-50"
                >
                  {suggestion.address}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="w-full rounded-lg p-2 text-xs text-slate-500 hover:bg-slate-50"
              >
                Хаах
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-expanded={mapOpen}
            onClick={() => setMapOpen(!mapOpen)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <MapPin className="size-4" />
            {mapOpen
              ? "Газрын зураг хураах"
              : hasPin
                ? "Сонгосон байршил харах"
                : "Газрын зураг дээр pin тавих"}
          </button>
          <span className="text-xs text-slate-500">
            {hasPin
              ? `${value.lat?.toFixed(5)}, ${value.lng?.toFixed(5)}`
              : "Байршилгүйгээр падан үүсгэж болно."}
          </span>
          {hasPin && (
            <button
              type="button"
              onClick={() => {
                update({ lat: null, lng: null });
                setSelectedStoreId(null);
              }}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100"
            >
              <X className="size-3.5" />
              Pin арилгах
            </button>
          )}
        </div>
      </div>
      {mapOpen && (
        <DispatchMapSection
          lat={value.lat}
          lng={value.lng}
          stores={state.stores}
          selectedStoreId={selectedStoreId}
          onSelectStore={selectStore}
          onPin={(lat, lng) => {
            update({ lat, lng });
            setSelectedStoreId(null);
          }}
        />
      )}
    </section>
  );
}
