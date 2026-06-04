"use client";

type HrServiceDetailListProps = {
  details: string[];
  className?: string;
};

export function HrServiceDetailList({
  details,
  className = "",
}: HrServiceDetailListProps) {
  if (details.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500 ${className}`}
      >
        Дэлгэрэнгүй input оруулаагүй байна. Admin дээр HR үйлчилгээ хэсгээс
        нэмэлт мэдээлэл оруулж болно.
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}
    >
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        Дэлгэрэнгүй мэдээлэл
      </p>
      <div className="mt-3 space-y-2">
        {details.map((detail, index) => (
          <div
            key={`${detail}-${index}`}
            className="flex gap-3 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-700"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
              {index + 1}
            </span>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
