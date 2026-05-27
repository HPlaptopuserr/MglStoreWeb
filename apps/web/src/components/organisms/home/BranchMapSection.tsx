"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Building2, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { API } from "@/lib/api";

type BranchPoint = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  hasCoordinates?: boolean;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
};

const MIN_BRANCH_RADIUS_METERS = 500;

async function getLeafletLib() {
  const leafletModule: any = await import("leaflet");
  return leafletModule?.default ?? leafletModule;
}

export function BranchMapSection() {
  const [branches, setBranches] = useState<BranchPoint[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isMapEnabled, setIsMapEnabled] = useState(false);
  const [isVisibilityLoaded, setIsVisibilityLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);

  useEffect(() => {
    fetch(`${API}/site-settings`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, string>) => {
        const raw = data["show-branch-map"];
        // Branch map enabled by default (unless explicitly disabled)
        const disabled = raw === "false" || raw === "0" || raw === "off";
        const enabled = !disabled;
        setIsMapEnabled(enabled);
      })
      .catch(() => {
        // Enable branch map by default if settings cannot be fetched
        setIsMapEnabled(true);
      })
      .finally(() => setIsVisibilityLoaded(true));
  }, []);

  useEffect(() => {
    if (!isVisibilityLoaded) return;

    if (!isMapEnabled) {
      setLoading(false);
      setBranches([]);
      setActiveBranchId(null);
      return;
    }

    setLoading(true);
    fetch(`${API}/branches/map`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: BranchPoint[]) => {
        setBranches(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setActiveBranchId(data[0].id);
        }
      })
      .catch(() => {
        setBranches([]);
        setError("Байршлын мэдээлэл татах үед алдаа гарлаа.");
      })
      .finally(() => setLoading(false));
  }, [isMapEnabled, isVisibilityLoaded]);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === activeBranchId) || branches.find((b) => b.lat !== null && b.lng !== null) || branches[0],
    [branches, activeBranchId],
  );
  const mappableBranches = useMemo(
    () => branches.filter((branch) => branch.lat !== null && branch.lng !== null),
    [branches],
  );
  const activeMapBranch = useMemo(
    () =>
      mappableBranches.find((branch) => branch.id === activeBranchId) ||
      mappableBranches[0],
    [activeBranchId, mappableBranches],
  );

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;
    if (!activeMapBranch || activeMapBranch.lat === null || activeMapBranch.lng === null) return;

    let cancelled = false;

    const setup = async () => {
      const L = await getLeafletLib();
      if (cancelled || !mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current).setView([activeMapBranch.lat, activeMapBranch.lng], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);

      setTimeout(() => map.invalidateSize(), 0);
    };

    setup().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [loading, activeMapBranch]);

  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current) return;
    if (!mapReady) return;

    const syncMap = async () => {
      const L = await getLeafletLib();
      if (!mapInstanceRef.current || !markerLayerRef.current) return;

      const map = mapInstanceRef.current;
      const layer = markerLayerRef.current;
      layer.clearLayers();

      const bounds = L.latLngBounds([]);
      mappableBranches.forEach((branch) => {
        if (branch.lat === null || branch.lng === null) return;
        const isActive = activeMapBranch?.id === branch.id;
        const latLng: [number, number] = [branch.lat, branch.lng];

        const marker = L.circleMarker(latLng, {
          radius: isActive ? 9 : 7,
          color: isActive ? "#e11d48" : "#334155",
          weight: isActive ? 3 : 2,
          fillColor: isActive ? "#fb7185" : "#94a3b8",
          fillOpacity: isActive ? 0.9 : 0.8,
        });
        marker.bindTooltip(branch.name, { direction: "top", offset: [0, -8] });
        marker.on("click", () => setActiveBranchId(branch.id));
        marker.addTo(layer);

        L.circle(latLng, {
          radius: MIN_BRANCH_RADIUS_METERS,
          color: isActive ? "#e11d48" : "#64748b",
          weight: 1,
          fillColor: isActive ? "#fecdd3" : "#cbd5e1",
          fillOpacity: isActive ? 0.14 : 0.06,
        }).addTo(layer);

        bounds.extend(latLng);
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
      }
    };

    syncMap().catch(() => {});
  }, [mappableBranches, activeMapBranch, mapReady]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerLayerRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  if (!isVisibilityLoaded || !isMapEnabled) {
    return null;
  }

  if (loading) {
    return (
      <section className="container mx-auto px-4 md:px-6 py-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Салбарын байршил ачаалж байна...
        </div>
      </section>
    );
  }

  if (!activeBranch) {
    return (
      <section className="container mx-auto px-4 md:px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl">
            <MapPin className="h-5 w-5 text-rose-500" />
            Салбарын байршил
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            {error ||
              "Одоогоор map дээр харуулах салбар алга. Админ хэсгээс салбар нэмэхдээ lat/lng оруулна уу."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 md:px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 sm:text-xl">
            <MapPin className="h-5 w-5 text-rose-500" />
            Салбарын байршил
          </h2>
          <a
            href={
              activeMapBranch
                ? `https://maps.google.com/?q=${activeMapBranch.lat},${activeMapBranch.lng}`
                : "#"
            }
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              activeMapBranch
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "pointer-events-none bg-slate-100 text-slate-400"
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            Google Maps
          </a>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {activeMapBranch ? (
              <div ref={mapRef} className="h-[360px] w-full" />
            ) : (
              <div className="flex h-[360px] items-center justify-center px-6 text-center text-sm text-slate-500">
                Салбар бүртгэгдсэн байна. Map дээр харуулахын тулд lat/lng координат нэмнэ үү.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {branches.map((branch) => {
                const isActive = branch.id === activeBranch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setActiveBranchId(branch.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      isActive
                        ? "border-rose-300 bg-white shadow-sm"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900 break-words">{branch.name}</p>
                    <p className="mt-1 text-xs text-slate-500 break-words">{branch.address}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Building2 className="h-3.5 w-3.5" />
                        {branch.organization.name}
                      </span>
                      {(branch.lat === null || branch.lng === null) && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Координатгүй
                        </span>
                      )}
                      <Link
                        href={`/organizations/${branch.organization.slug}`}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Профайл
                      </Link>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
