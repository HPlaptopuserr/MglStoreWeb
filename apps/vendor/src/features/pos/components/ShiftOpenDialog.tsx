type Props = {
  openingCash: number;
  setOpeningCash: (value: number) => void;
  onOpenShift: () => void;
  loading?: boolean;
};

export function ShiftOpenDialog({
  openingCash,
  setOpeningCash,
  onOpenShift,
  loading,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Shift нээх</h3>
      <div className="mt-3 flex items-end gap-2">
        <label className="flex-1 text-xs text-slate-600">
          Эхлэх cash
          <input
            type="number"
            min={0}
            value={openingCash}
            onChange={(e) => setOpeningCash(Number(e.target.value || 0))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onOpenShift}
          disabled={loading}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Нээж байна..." : "Нээх"}
        </button>
      </div>
    </div>
  );
}
