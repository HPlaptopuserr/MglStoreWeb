import type { RefObject } from "react";
import { Loader2, Plus } from "lucide-react";
import type { CardPartner, BranchFormState } from "@/lib/sections/types";

type NearestConflict = {
  item: { name: string };
  distanceMeters: number;
} | null;

type Props = {
  partners: CardPartner[];
  orgId: string;
  setOrgId: (id: string) => void;
  selectedOrg: CardPartner | undefined;
  form: BranchFormState;
  setForm: React.Dispatch<React.SetStateAction<BranchFormState>>;
  branchSaving: boolean;
  nearestDraftConflict: NearestConflict;
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
  nearestDraftConflict,
  branchMapError,
  mapPickerRef,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
        Байгууллага сонгох
      </label>

      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {selectedOrg && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
            Салбар нэмэгдэх газар
          </p>
          <p className="mt-1 text-sm font-bold text-indigo-900 break-words">{selectedOrg.name}</p>
          <p className="text-xs text-indigo-600 break-all">@{selectedOrg.slug}</p>
        </div>
      )}

      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        placeholder="Салбарын нэр"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />
      <input
        type="text"
        value={form.address}
        onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        placeholder="Салбарын хаяг"
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="any"
          value={form.lat}
          onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
          placeholder="Өргөрөг (lat)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <input
          type="number"
          step="any"
          value={form.lng}
          onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
          placeholder="Уртраг (lng)"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600">
            Pin дээр дарж координат сонгох
          </p>
          <span className="text-[11px] text-slate-500">Map дээр click хийнэ үү</span>
        </div>
        <div ref={mapPickerRef} className="h-56 w-full" />
        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
          <p className="text-[11px] text-slate-600">
            Map дээр 500м радиус автоматаар тэмдэглэгдэнэ.
          </p>
        </div>
        {branchMapError && (
          <p className="px-3 py-2 text-xs text-rose-600 border-t border-rose-100 bg-rose-50">
            {branchMapError}
          </p>
        )}
      </div>

      {nearestDraftConflict && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          500м дотор &quot;{nearestDraftConflict.item.name}&quot; салбар байна (
          {Math.round(nearestDraftConflict.distanceMeters)}м). Өөр цэг сонгоно уу.
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={branchSaving || !orgId || !!nearestDraftConflict}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
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
