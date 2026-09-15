import { CalendarDays, X } from "lucide-react";

type MovementDateFilterProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onClear: () => void;
};

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function MovementDateFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
}: MovementDateFilterProps) {
  const today = localDate(new Date());
  const selectDays = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    onFromChange(localDate(start));
    onToChange(today);
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        Хугацаа
      </span>
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Хугацааны сонголт"
      >
        {[
          { label: "Бүх хугацаа", days: 0 },
          { label: "Өнөөдөр", days: 1 },
          { label: "7 хоног", days: 7 },
          { label: "30 хоног", days: 30 },
        ].map(({ label, days }) => {
          const start = new Date();
          start.setDate(start.getDate() - days + 1);
          const active =
            days === 0
              ? !from && !to
              : from === localDate(start) && to === today;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={active}
              onClick={() => (days ? selectDays(days) : onClear())}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        <input
          aria-label="Эхлэх огноо"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-36"
        />
        <span aria-hidden="true" className="text-slate-400">
          –
        </span>
        <input
          aria-label="Дуусах огноо"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onToChange(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-36"
        />
        {(from || to) && (
          <button
            type="button"
            aria-label="Огноо цэвэрлэх"
            onClick={onClear}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
