"use client";
export default function BuildingError({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-white p-8"
    >
      <h2 className="text-xl font-bold">Мэдээлэл ачаалж чадсангүй</h2>
      <p className="mt-3 text-slate-600">
        Холболтоо шалгаад дахин оролдоно уу.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900"
      >
        Дахин оролдох
      </button>
    </section>
  );
}
