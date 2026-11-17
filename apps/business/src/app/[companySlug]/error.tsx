"use client";
export default function CompanySiteError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <h1>Байгууллагын танилцуулгыг ачаалж чадсангүй.</h1>
      <button type="button" onClick={reset}>
        Дахин оролдох
      </button>
    </div>
  );
}
