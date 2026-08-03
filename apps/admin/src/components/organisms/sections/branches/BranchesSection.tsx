"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, MapPin, Plus, X } from "lucide-react";
import { useBranches } from "@/hooks/sections/useBranches";
import { BranchForm } from "@/components/molecules/sections/branches/BranchForm";
import { BranchPreviewPanel } from "@/components/molecules/sections/branches/BranchPreviewPanel";
import { getLeafletLib } from "@/lib/sections/utils";
import { BRANCH_MAP_ATTRIBUTION, UB_CENTER } from "@/lib/sections/constants";

type Props = {
  showBranchMapOnWeb: boolean;
  onToggle: () => void;
  saving: boolean;
};

export function BranchesSection({
  showBranchMapOnWeb,
  onToggle,
  saving,
}: Props) {
  const [active, setActive] = useState(true);
  const [branchMapError, setBranchMapError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

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
      setBranchMapError(
        "Map ачаалахад алдаа гарлаа. Хуудсаа дахин ачаална уу.",
      );
    });

    return () => {
      cancelled = true;
    };
  }, [branches.branchLoading, editorOpen]);

  useEffect(() => {
    if (branches.branchSuccess) setEditorOpen(false);
  }, [branches.branchSuccess]);

  useEffect(() => {
    if (editorOpen || !mapInstanceRef.current) return;
    mapInstanceRef.current.remove();
    mapInstanceRef.current = null;
    markerInstanceRef.current = null;
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditorOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editorOpen]);

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
    const nextLatLng: [number, number] = [
      branches.parsedBranchLat,
      branches.parsedBranchLng,
    ];

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
      if (cancelled || !previewMapRef.current || previewMapInstanceRef.current)
        return;

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
        branches.selectedRegisteredBranch?.id ||
        branches.selectedRegisteredBranchId;

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
        marker.on("click", () =>
          branches.setSelectedRegisteredBranchId(item.id),
        );
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
        draftMarker.bindTooltip("Шинэ байршлын draft", {
          direction: "top",
          offset: [0, -8],
        });
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
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <MapPin size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                Бүртгэлтэй салбарууд
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                {branches.branchItems.length}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Web map дээр харагдах салбарын байршлууд
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-xs font-bold text-slate-600">Web map</span>
            <button
              type="button"
              onClick={onToggle}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showBranchMapOnWeb ? "bg-violet-600" : "bg-slate-300"
              } disabled:opacity-60`}
              aria-label="Web map visibility toggle"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  showBranchMapOnWeb ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Plus size={16} /> Салбар нэмэх
          </button>
        </div>
      </section>

      {branches.branchLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 size={34} className="animate-spin" />
          <p className="mt-3 text-sm">
            Байгууллага болон салбарын мэдээлэл ачаалж байна...
          </p>
        </div>
      ) : branches.branchLoadError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-14 text-center text-rose-700">
          <AlertCircle size={34} />
          <p className="mt-3 text-sm font-bold">{branches.branchLoadError}</p>
          <button
            type="button"
            onClick={() => {
              setActive(false);
              setTimeout(() => setActive(true), 0);
            }}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            Дахин ачаалах
          </button>
        </div>
      ) : (
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
      )}

      {editorOpen && (
        <>
          <button
            type="button"
            aria-label="Салбар нэмэх цонх хаах"
            onClick={() => setEditorOpen(false)}
            className="fixed inset-0 z-[1000] cursor-default bg-slate-950/50 backdrop-blur-[2px]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-editor-title"
            className="fixed inset-x-3 top-3 z-[1010] isolate max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#fbfcff] p-4 shadow-2xl sm:inset-x-6 sm:top-6 sm:mx-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-3xl sm:p-5"
          >
            <div className="sticky -top-4 z-20 mb-4 flex items-center justify-between border-b border-slate-100 bg-white pb-3 pt-1 sm:-top-5">
              <div>
                <h3
                  id="branch-editor-title"
                  className="text-lg font-black text-slate-950"
                >
                  Шинэ салбар нэмэх
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  1. Байгууллага · 2. Мэдээлэл · 3. Map байршил
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                aria-label="Хаах"
              >
                <X size={16} />
              </button>
            </div>
            <BranchForm
              partners={branches.branchPartners}
              orgId={branches.branchOrgId}
              setOrgId={branches.setBranchOrgId}
              selectedOrg={branches.selectedBranchOrg}
              form={branches.branchForm}
              setForm={branches.setBranchForm}
              branchSaving={branches.branchSaving}
              branchError={branches.branchError}
              branchSuccess={branches.branchSuccess}
              branchValidationError={branches.branchValidationError}
              canCreateBranch={branches.canCreateBranch}
              branchMapError={branchMapError}
              mapPickerRef={mapPickerRef}
              onSubmit={branches.handleCreateBranch}
            />
          </section>
        </>
      )}
    </div>
  );
}
