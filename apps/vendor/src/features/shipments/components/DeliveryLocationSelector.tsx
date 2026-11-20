"use client";

import { API, authFetch } from "@/lib/api";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DeliveryLocation = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

type OrganizationDeliveryProfile = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  branches: Array<{
    id: string;
    name: string;
    address: string;
  }>;
};

type DeliveryLocationSelectorProps = {
  organizationId: string;
  address: string;
  phone: string;
  onAddressChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

const CUSTOM_LOCATION_ID = "custom";

function getDeliveryLocations(
  profile: OrganizationDeliveryProfile,
): DeliveryLocation[] {
  const locations: DeliveryLocation[] = [];

  if (profile.address?.trim()) {
    locations.push({
      id: `organization-${profile.id}`,
      name: profile.name,
      address: profile.address.trim(),
      phone: profile.phone?.trim() ?? "",
    });
  }

  for (const branch of profile.branches ?? []) {
    if (!branch.address?.trim()) continue;
    locations.push({
      id: branch.id,
      name: branch.name,
      address: branch.address.trim(),
      phone: profile.phone?.trim() ?? "",
    });
  }

  return locations;
}

export function DeliveryLocationSelector({
  organizationId,
  address,
  phone,
  onAddressChange,
  onPhoneChange,
}: DeliveryLocationSelectorProps) {
  const latest = useRef({ address, phone, onAddressChange, onPhoneChange });
  latest.current = { address, phone, onAddressChange, onPhoneChange };
  const [profile, setProfile] = useState<OrganizationDeliveryProfile | null>(
    null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const locations = useMemo(
    () => (profile ? getDeliveryLocations(profile) : []),
    [profile],
  );

  const loadProfile = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch(
          `${API}/partners/${organizationId}?includeProducts=false`,
          { cache: "no-store", signal },
        );
        const payload = (await response.json().catch(() => null)) as
          | OrganizationDeliveryProfile
          | { message?: string }
          | null;

        if (signal.aborted) return;
        if (!response.ok || !payload || !("id" in payload)) {
          throw new Error(
            payload && "message" in payload && payload.message
              ? payload.message
              : "Дэлгүүрийн мэдээлэл татаж чадсангүй",
          );
        }

        setProfile(payload);
        const availableLocations = getDeliveryLocations(payload);
        const firstLocation = availableLocations[0];
        const savedAddress = latest.current.address.trim();
        if (savedAddress) {
          const matchingLocation = availableLocations.find(
            (location) => location.address === savedAddress,
          );
          setSelectedLocationId(matchingLocation?.id ?? CUSTOM_LOCATION_ID);
        } else if (firstLocation) {
          setSelectedLocationId(firstLocation.id);
          latest.current.onAddressChange(firstLocation.address);
          latest.current.onPhoneChange(firstLocation.phone);
        } else {
          setSelectedLocationId(CUSTOM_LOCATION_ID);
        }
      } catch (loadError) {
        if (
          signal.aborted ||
          (loadError instanceof DOMException && loadError.name === "AbortError")
        )
          return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Дэлгүүрийн мэдээлэл татаж чадсангүй",
        );
        setSelectedLocationId(CUSTOM_LOCATION_ID);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile, retryAttempt]);

  const selectLocation = (location: DeliveryLocation) => {
    setSelectedLocationId(location.id);
    onAddressChange(location.address);
    onPhoneChange(location.phone);
  };

  const selectCustomLocation = () => {
    setSelectedLocationId(CUSTOM_LOCATION_ID);
    onAddressChange("");
    onPhoneChange(profile?.phone?.trim() ?? "");
  };

  const isCustomLocation = selectedLocationId === CUSTOM_LOCATION_ID;

  return (
    <section
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-labelledby="delivery-location-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id="delivery-location-title"
            className="text-sm font-bold text-slate-900"
          >
            Хүргэлтийн мэдээлэл
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Бараагаа хүлээн авах хаяг, холбоо барих утас
          </p>
        </div>
        {profile && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Бүртгэлтэй хаяг
          </span>
        )}
      </div>

      {loading ? (
        <div
          className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-amber-600" />
          Дэлгүүрийн бүртгэлийн мэдээлэл татаж байна...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-100 bg-rose-50 p-3"
        >
          <p className="text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setRetryAttempt((attempt) => attempt + 1)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Дахин татах
          </button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {locations.map((location, index) => {
            const isSelected = selectedLocationId === location.id;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => selectLocation(location)}
                aria-pressed={isSelected}
                className={`group w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-[#FFAD02] bg-amber-50/70 shadow-sm"
                    : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`rounded-md p-1.5 ${
                      isSelected
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-500 group-hover:text-[#D88900]"
                    }`}
                  >
                    {index === 0 ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="break-words text-sm font-semibold text-slate-800">
                        {location.name}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-[#D88900]" />
                      )}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-5 text-slate-600">
                      {location.address}
                    </span>
                    {location.phone && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {location.phone}
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={selectCustomLocation}
            aria-pressed={isCustomLocation}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:col-span-2 ${
              isCustomLocation
                ? "border-[#FFAD02] bg-amber-50 text-[#B86E00]"
                : "border-slate-300 text-slate-600 hover:border-[#FFAD02] hover:bg-amber-50 hover:text-[#B86E00]"
            }`}
          >
            <Plus className="h-4 w-4" />
            Өөр хаягаар хүлээн авах
          </button>
        </div>
      )}

      {!loading && locations.length === 0 && !error && !isCustomLocation && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
          Бүртгэлтэй хаяг алга. Хүргүүлэх байршлаа доор оруулна уу.
        </p>
      )}

      {isCustomLocation && (
        <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Хүргүүлэх хаяг <span className="text-rose-500">*</span>
            </span>
            <textarea
              rows={2}
              value={address}
              onChange={(event) => onAddressChange(event.target.value)}
              placeholder="Дүүрэг, хороо, байр, тоот..."
              autoComplete="street-address"
              required
              className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Холбоо барих утас
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="Жишээ: 99112233"
              autoComplete="tel"
              inputMode="tel"
              className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
          </label>
        </div>
      )}
    </section>
  );
}
