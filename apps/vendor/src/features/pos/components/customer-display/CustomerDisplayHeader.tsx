"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, Signal } from "lucide-react";

export function CustomerDisplayHeader({
  storeName,
  registerName,
  hasItems,
}: {
  storeName: string;
  registerName?: string;
  hasItems: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const updateNetwork = () => setOnline(navigator.onLine);
    tick();
    updateNetwork();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);
  const dateParts = now
    ? new Intl.DateTimeFormat("en", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(now)
    : [];
  const datePart = (part: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((item) => item.type === part)?.value ?? "";
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5 shadow-sm xl:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 text-2xl font-black text-white shadow-md shadow-indigo-100">
          M
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="max-w-80 truncate text-xl font-black tracking-tight text-slate-900">
              {storeName}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${online ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {online ? "ОНЛАЙН" : "ХОЛБОЛТ ТАСАРСАН"}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Монголын худалдааны нэгдсэн сүлжээ
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {registerName && (
          <span className="hidden max-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 xl:inline-flex">
            <Signal size={15} className="shrink-0 text-emerald-500" />
            <span className="truncate">{registerName}</span>
          </span>
        )}
        <div className="shrink-0 text-right">
          <p className="font-mono text-xl font-bold tracking-wide tabular-nums text-slate-700">
            {now?.toLocaleTimeString("mn-MN", {
              hour12: false,
              timeZone: "Asia/Ulaanbaatar",
            }) ?? "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-400">
            {now
              ? `${datePart("year")} оны ${datePart("month")} сарын ${datePart("day")}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-md shadow-blue-600/15">
          <LoaderCircle
            size={23}
            aria-hidden="true"
            className={`shrink-0 text-blue-300 ${hasItems ? "motion-safe:animate-spin" : ""}`}
          />
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-blue-200">
              ТӨЛӨВ
            </p>
            <p className="mt-0.5 text-xs font-extrabold sm:text-sm">
              {hasItems ? "ГҮЙЛГЭЭ ХИЙГДЭЖ БАЙНА" : "ТАВТАЙ МОРИЛНО УУ"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
