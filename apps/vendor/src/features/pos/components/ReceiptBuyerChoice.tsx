"use client";

interface Props {
  company: boolean;
  onChange: (company: boolean) => void;
  disabled: boolean;
}

export function ReceiptBuyerChoice({ company, onChange, disabled }: Props) {
  return (
    <div
      role="group"
      aria-label="eBarimt авах төрөл"
      className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
    >
      <span className="text-xs font-semibold text-slate-500">eBarimt</span>
      <div className="flex rounded-lg bg-slate-50 p-0.5">
        {(
          [
            { company: false, label: "Хувь хүн" },
            { company: true, label: "Байгууллага" },
          ] as const
        ).map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={company === option.company}
            disabled={disabled}
            onClick={() => onChange(option.company)}
            className={`min-h-8 rounded-md px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 ${company === option.company ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
