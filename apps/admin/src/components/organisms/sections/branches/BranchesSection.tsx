"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useBranches } from "@/hooks/sections/useBranches";
import { BranchForm } from "@/components/molecules/sections/branches/BranchForm";
import { BranchPreviewPanel } from "@/components/molecules/sections/branches/BranchPreviewPanel";
import { getLeafletLib } from "@/lib/sections/utils";
import {
  BRANCH_MAP_ATTRIBUTION,
  UB_CENTER,
} from "@/lib/sections/constants";

type Props = {
  showBranchMapOnWeb: boolean;
  onToggle: () => void;
  saving: boolean;
};

export function BranchesSection({ showBranchMapOnWeb, onToggle, saving }: Props) {
  const [active, setActive] = useState(true);
  const [branchMapError, setBranchMapError] = useState("");

  const branches = useBranches(active);

  // ── Picker map refs ──────────────────────────────────────────────────────
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // ── Preview map refs ─────────────────────────────────────────────────────
  const previewMapRef = useRef<HTMLDivElement>(null);
  const previewMapInstanceRef = useRef<any>(null);
  const previewLayerRef = useRef<any>(null);

  // ── Picker map init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (branches.branchLoading) return;
    if (!mapPickerRef.current || mapInstanceRef.current) return;

    setBranchMapError("");
    let cancelled = false;

    const init = async () => {
      const L = await getLeafletLib();
      if (cancelled || !mapPickerRef.current || mapInstanceRef.current) return;

      const map = L.map(mapPickerRef.current).setView(UB_CENTER, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: BRANCH_MAP_ATTRIBUTION,
      }).addTo(map);

      map.on("click", (event: any) => {
        const { lat, lng } = event.latlng;
        branches.setBranchForm((prev) => ({
          ...prev,
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
        }));
      });

      setTimeout(() => map.invalidateSize(), 0);
      mapInstanceRef.current = map;
    };

    init().catch((err) => {
      console.error("Picker map init failed", err);
      setBranchMapError("Map ачаалахад алдаа гарлаа. Хуудсаа дахин ачаална уу.");
    });

    return () => {
      cancelled = true;
    };
  }, [branches.branchLoading]);

  // Cleanup picker map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, []);

  // ── Picker marker + 500m circle sync ────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!branches.isBranchCoordsValid) {
      markerInstanceRef.current?.remove();
      markerInstanceRef.current = null;
      return;
    }

    const map = mapInstanceRef.current;
    const nextLatLng: [number, number] = [branches.parsedBranchLat, branches.parsedBranchLng];

    const sync = async () => {
      const L = await getLeafletLib();
      if (!mapInstanceRef.current) return;

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng(nextLatLng);
      } else {
        markerInstanceRef.current = L.circleMarker(nextLatLng, {
          radius: 8,
          color: "#7c3aed",
          weight: 2,
          fillColor: "#a78bfa",
          fillOpacity: 0.8,
        }).addTo(map);
      }

      if (map.getZoom() < 14) {
        map.setView(nextLatLng, 14);
      } else {
        map.panTo(nextLatLng);
      }
    };

    sync().catch(() => {});
  }, [
    branches.isBranchCoordsValid,
    branches.parsedBranchLat,
    branches.parsedBranchLng,
  ]);

  // ── Preview map init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (branches.branchLoading) return;
    if (!previewMapRef.current || previewMapInstanceRef.current) return;

    let cancelled = false;

    const init = async () => {
      const L = await getLeafletLib();
      if (cancelled || !previewMapRef.current || previewMapInstanceRef.current) return;

      const map = L.map(previewMapRef.current).setView(UB_CENTER, 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: BRANCH_MAP_ATTRIBUTION,
      }).addTo(map);

      previewLayerRef.current = L.layerGroup().addTo(map);
      previewMapInstanceRef.current = map;

      setTimeout(() => map.invalidateSize(), 0);
    };

    init().catch((err) => {
      console.error("Preview map init failed", err);
    });

    return () => {
      cancelled = true;
    };
  }, [branches.branchLoading]);

  // Cleanup preview map on unmount
  useEffect(() => {
    return () => {
      if (previewMapInstanceRef.current) {
        previewMapInstanceRef.current.remove();
        previewMapInstanceRef.current = null;
        previewLayerRef.current = null;
      }
    };
  }, []);

  // ── Preview markers sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!previewMapInstanceRef.current || !previewLayerRef.current) return;

    const sync = async () => {
      const L = await getLeafletLib();
      if (!previewMapInstanceRef.current || !previewLayerRef.current) return;

      const map = previewMapInstanceRef.current;
      const layer = previewLayerRef.current;
      layer.clearLayers();

      const bounds = L.latLngBounds([]);
      const activeId =
        branches.selectedRegisteredBranch?.id || branches.selectedRegisteredBranchId;

      branches.branchItems.forEach((item) => {
        if (item.lat === null || item.lng === null) return;

        const latLng: [number, number] = [item.lat, item.lng];
        const isActive = item.id === activeId;

        const marker = L.circleMarker(latLng, {
          radius: isActive ? 9 : 7,
          color: isActive ? "#7c3aed" : "#334155",
          weight: isActive ? 3 : 2,
          fillColor: isActive ? "#c4b5fd" : "#94a3b8",
          fillOpacity: isActive ? 0.95 : 0.8,
        });

        marker.bindTooltip(item.name, { direction: "top", offset: [0, -8] });
        marker.on("click", () => branches.setSelectedRegisteredBranchId(item.id));
        marker.addTo(layer);

        bounds.extend(latLng);
      });

      if (branches.isBranchCoordsValid) {
        const draftLatLng: [number, number] = [
          branches.parsedBranchLat,
          branches.parsedBranchLng,
        ];
        const draftMarker = L.circleMarker(draftLatLng, {
          radius: 8,
          color: "#16a34a",
          weight: 2,
          fillColor: "#86efac",
          fillOpacity: 0.85,
        });
        draftMarker.bindTooltip("Шинэ байршлын draft", { direction: "top", offset: [0, -8] });
        draftMarker.addTo(layer);
        bounds.extend(draftLatLng);
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2), { maxZoom: 14 });
      }
    };

    sync().catch(() => {});
  }, [
    branches.branchItems,
    branches.isBranchCoordsValid,
    branches.parsedBranchLat,
    branches.parsedBranchLng,
    branches.selectedRegisteredBranch,
    branches.selectedRegisteredBranchId,
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Салбарын байршил</h2>
        <p className="text-sm text-slate-400">
          Нүүр хуудасны хамгийн доод хэсэгт харагдах map-д салбарын байршлыг нэмнэ.
        </p>

        {/* Web map visibility toggle */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-700">Web дээр map харуулах</p>
            <p className="text-xs text-slate-500">
              Асаалттай үед web нүүр хуудсанд салбарын map харагдана.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              showBranchMapOnWeb ? "bg-violet-600" : "bg-slate-300"
            } disabled:opacity-60`}
            aria-label="Web map visibility toggle"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                showBranchMapOnWeb ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {branches.branchLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 size={34} className="animate-spin" />
          <p className="mt-3 text-sm">
            Байгууллага болон салбарын мэдээлэл ачаалж байна...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BranchForm
            partners={branches.branchPartners}
            orgId={branches.branchOrgId}
            setOrgId={branches.setBranchOrgId}
            selectedOrg={branches.selectedBranchOrg}
            form={branches.branchForm}
            setForm={branches.setBranchForm}
            branchSaving={branches.branchSaving}
            branchMapError={branchMapError}
            mapPickerRef={mapPickerRef}
            onSubmit={branches.handleCreateBranch}
          />

          <BranchPreviewPanel
            previewMapRef={previewMapRef}
            hasMapPreview={branches.hasMapPreview}
            isBranchCoordsValid={branches.isBranchCoordsValid}
            selectedRegisteredBranch={branches.selectedRegisteredBranch}
            previewLat={branches.previewLat}
            previewLng={branches.previewLng}
            filteredItems={branches.filteredRegisteredBranchItems}
            allCount={branches.branchItems.length}
            selectedId={branches.selectedRegisteredBranchId}
            onSelect={branches.setSelectedRegisteredBranchId}
            searchCity={branches.branchSearchCity}
            setSearchCity={branches.setBranchSearchCity}
            searchDistrict={branches.branchSearchDistrict}
            setSearchDistrict={branches.setBranchSearchDistrict}
            searchKhoroo={branches.branchSearchKhoroo}
            setSearchKhoroo={branches.setBranchSearchKhoroo}
          />
        </div>
      )}
    </div>
  );
}
