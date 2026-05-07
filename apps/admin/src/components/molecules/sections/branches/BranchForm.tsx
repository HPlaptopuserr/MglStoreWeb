import type { Dispatch, RefObject, SetStateAction } from "react";
import { Building2, Loader2, MapPin, Plus, Tag } from "lucide-react";
import type { CardPartner, BranchFormState } from "@/lib/sections/types";

type Props = {
  partners: CardPartner[];
  orgId: string;
  setOrgId: (id: string) => void;
  selectedOrg: CardPartner | undefined;
  form: BranchFormState;
  setForm: Dispatch<SetStateAction<BranchFormState>>;
  branchSaving: boolean;
  branchMapError: string;
  mapPickerRef: RefObject<HTMLDivElement>;
  onSubmit: () => void;
};

export function BranchForm({
  partners,
  orgId,
  setOrgId,
  selectedOrg,
  form,
  setForm,
  branchSaving,
  branchMapError,
  mapPickerRef,
  onSubmit,
}: Props) {
  const hasCoords = form.lat.trim() !== "" && form.lng.trim() !== "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      {/* ── Step 1: Organization ─────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Building2 size={13} />
          </div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            1. Байгууллага сонгох
          </label>
        </div>

        <select
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-shadow"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {selectedOrg && (
          <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 px-3.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Building2 size={16} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {selectedOrg.name}
              </p>
              <p className="text-xs text-violet-600">@{selectedOrg.slug}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: Branch Info ──────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Tag size={13} />
          </div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            2. Салбарын мэдээлэл
          </label>
        </div>

        <input
          type="text"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Салбарын нэр (жишээ: Төв салбар)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-shadow"
        />

        <input
          type="text"
          value={form.address}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="Салбарын хаяг (жишээ: СБД 1-р хороо, Энхтайвны өргөн чөлөө)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-shadow"
        />
      </div>

      {/* ── Step 3: Location ────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <MapPin size={13} />
          </div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            3. Байршил тодорхойлох
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lat: e.target.value }))
              }
              placeholder="47.9187"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-shadow"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
              LAT
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, lng: e.target.value }))
              }
              placeholder="106.9176"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-shadow"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
              LNG
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-violet-500" />
              <p className="text-xs font-semibold text-slate-600">
                Map дээр дарж байршил сонгох
              </p>
            </div>

            {hasCoords && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Сонгогдсон
              </span>
            )}
          </div>

          <div ref={mapPickerRef} className="h-64 w-full" />

          <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
            <p className="text-[11px] text-slate-500">
              Map дээр дарахад координат автоматаар бөглөгдөнө.
            </p>
          </div>

          {branchMapError && (
            <p className="px-3 py-2 text-xs text-rose-600 border-t border-rose-100 bg-rose-50">
              {branchMapError}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={branchSaving || !orgId}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:bg-violet-700 hover:shadow-md hover:shadow-violet-200 disabled:opacity-60 disabled:shadow-none"
      >
        {branchSaving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Plus size={15} />
        )}
        {branchSaving ? "Нэмж байна..." : "Салбар нэмэх"}
      </button>
    </div>
  );
}