import {
  Coins,
  Download,
  FileText,
  Loader2,
  ShoppingBag,
  Sparkles,
  BadgeCheck,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import type { AccountContract, AccountPurchase, MPointHistory } from "./types";

function sourceLabel(sourceType: AccountPurchase["sourceType"]) {
  if (sourceType === "FRANCHISE") return "Franchise";
  if (sourceType === "SERVICE") return "Үйлчилгээ";
  return "Төсөл";
}

export function AccountLibraryPanel({
  purchases,
  contracts,
  points,
  history,
  loading,
}: {
  purchases: AccountPurchase[];
  contracts: AccountContract[];
  points: number;
  history: MPointHistory[];
  loading: boolean;
}) {
  const hasLibraryItems = purchases.length > 0 || contracts.length > 0;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
              Purchased files
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Худалдан авсан файл, төсөл, franchise
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Төлбөр баталгаажсан PDF болон digital access энд хадгалагдана.
            </p>
          </div>
          <span className="w-fit rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
            {purchases.length + contracts.length} access
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl bg-slate-50">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : !hasLibraryItems ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
              <ShoppingBag size={32} />
            </div>
            <h3 className="mt-5 text-lg font-black text-slate-900">
              Одоогоор худалдан авсан файл алга
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Төсөл эсвэл franchise худалдан авмагц файл нь автоматаар энэ
              хэсэгт хадгалагдаж, дахин QR төлөхгүйгээр нээгдэнэ.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {contracts.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                    <BadgeCheck size={18} className="text-emerald-500" />
                    Миний гэрээнүүд
                  </h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {contracts.length} гэрээ
                  </span>
                </div>
                <div className="grid gap-3">
                  {contracts.map((contract) => {
                    const openUrl = contract.pdfUrl || contract.printUrl;
                    return (
                      <article
                        key={contract.id}
                        className="group grid gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 transition hover:border-emerald-300 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center"
                      >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-200">
                          <FileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                              {contract.status === "SIGNED" ? "Баталгаажсан" : "Хүлээгдэж буй"}
                            </span>
                            {contract.feePlanLabel && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                {contract.feePlanLabel}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 line-clamp-1 text-base font-black text-slate-950">
                            {contract.title}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">
                            {contract.org}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
                            <span>
                              Үүссэн: {new Date(contract.createdAt).toLocaleDateString("mn-MN")}
                            </span>
                            {contract.expiresAt && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <CalendarClock size={13} />
                                Дуусах: {new Date(contract.expiresAt).toLocaleDateString("mn-MN")}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={openUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-emerald-600"
                        >
                          <ExternalLink size={16} />
                          Гэрээ нээх
                        </a>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {purchases.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-slate-950">
                    Худалдан авсан файлууд
                  </h3>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-600">
                    {purchases.length} access
                  </span>
                </div>
                <div className="grid gap-4">
                  {purchases.map((purchase) => (
                    <article
                      key={purchase.id}
                      className="group grid gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-orange-50/50 p-4 transition hover:border-orange-200 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-orange-200">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">
                            {sourceLabel(purchase.sourceType)}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {new Date(purchase.purchasedAt).toLocaleDateString("mn-MN")}
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-1 text-base font-black text-slate-950">
                          {purchase.title}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          ₮{Number(purchase.amount || 0).toLocaleString("mn-MN")} · 2%
                          M point нэмэгдсэн
                        </p>
                      </div>
                      {purchase.fileUrl ? (
                        <a
                          href={purchase.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-orange-600"
                        >
                          <Download size={16} />
                          Файл нээх
                        </a>
                      ) : (
                        <span className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-400">
                          Файл оруулаагүй
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-200">
                M point
              </p>
              <p className="mt-3 text-4xl font-black">
                {points.toLocaleString("mn-MN")} M
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-orange-200">
              <Coins size={34} />
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/60">
            Худалдан авалт бүрээс 2% автоматаар нэмэгдэж, log нь доор үлдэнэ.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-orange-500" />
            <h3 className="text-base font-black text-slate-950">
              Онооны түүх
            </h3>
          </div>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-500">
              Одоогоор онооны log алга байна.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-bold text-slate-900">
                      {entry.description}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {new Date(entry.date).toLocaleString("mn-MN")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-600">
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
