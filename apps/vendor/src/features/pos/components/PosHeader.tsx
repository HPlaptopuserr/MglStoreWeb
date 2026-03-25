type Props = {
  title: string;
  branchName: string;
  registerName: string;
  cashierName: string;
  shiftStatus: "Нээлттэй" | "Хаалттай";
};

export function PosHeader({
  title,
  branchName,
  registerName,
  cashierName,
  shiftStatus,
}: Props) {
  const isOpen = shiftStatus === "Нээлттэй";

  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">POS</p>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Салбар</p>
            <p className="mt-0.5 font-semibold text-slate-800">{branchName}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Касс</p>
            <p className="mt-0.5 font-semibold text-slate-800">{registerName}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-slate-500">Кассчин</p>
            <p className="mt-0.5 font-semibold text-slate-800">{cashierName}</p>
          </div>
          <div
            className={`rounded-lg px-3 py-2 ${
              isOpen ? "bg-emerald-50" : "bg-slate-100"
            }`}
          >
            <p className="text-slate-500">Shift</p>
            <p
              className={`mt-0.5 font-semibold ${
                isOpen ? "text-emerald-700" : "text-slate-700"
              }`}
            >
              {shiftStatus}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
