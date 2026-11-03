"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import type { DispatchStore } from "./types";
const DispatchLocationPicker = dynamic(
  () =>
    import("./DispatchLocationPicker").then(
      (module) => module.DispatchLocationPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="flex min-h-72 items-center justify-center text-sm text-slate-500"
      >
        Газрын зураг ачаалж байна…
      </p>
    ),
  },
);

export function DispatchMapSection({
  lat,
  lng,
  stores,
  selectedStoreId,
  onSelectStore,
  onPin,
}: {
  lat: number | null;
  lng: number | null;
  stores: DispatchStore[];
  selectedStoreId: string | null;
  onSelectStore: (store: DispatchStore) => void;
  onPin: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError("Энэ төхөөрөмж байршил тодорхойлох боломжгүй байна.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onPin(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError(
          "Байршил авч чадсангүй. Газрын зураг дээр гараар pin тавьж болно.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  return (
    <div className="border-t border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3">
        <p className="text-xs text-slate-500">
          Бүртгэлгүй дэлгүүрийн хүргэх цэг дээр дарж pin тавина.
        </p>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LocateFixed className="size-4" />
          )}
          Одоогийн байршил
        </button>
      </div>
      {locationError && (
        <p role="alert" className="bg-amber-50 p-3 text-xs text-amber-800">
          {locationError}
        </p>
      )}
      <div className="relative h-80">
        <DispatchLocationPicker
          lat={lat}
          lng={lng}
          stores={stores}
          selectedStoreId={selectedStoreId}
          onSelectStore={onSelectStore}
          onChange={onPin}
        />
      </div>
    </div>
  );
}
