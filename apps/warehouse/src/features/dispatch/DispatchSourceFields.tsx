export function DispatchSourceFields({
  warehouseName,
  reason,
  note,
  onReason,
  onNote,
}: {
  warehouseName: string;
  reason: string;
  note: string;
  onReason: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-bold text-slate-950">Нэмэлт мэдээлэл</h2>
      <p className="mt-2 text-sm text-slate-500">
        Илгээгч агуулах:{" "}
        <span className="font-semibold text-slate-800">{warehouseName}</span>
      </p>
      <div className="mt-4 space-y-4">
        <label className="block text-xs font-semibold text-slate-600">
          Гаргах шалтгаан{" "}
          <span className="font-normal text-slate-400">· сонголттой</span>
          <input
            value={reason}
            onChange={(event) => onReason(event.target.value)}
            maxLength={250}
            placeholder="Захиалга, борлуулалт, бусад…"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Тэмдэглэл{" "}
          <span className="font-normal text-slate-400">· сонголттой</span>
          <textarea
            value={note}
            onChange={(event) => onNote(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Нэмэлт тайлбар…"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
    </section>
  );
}
