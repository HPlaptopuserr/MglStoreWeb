import Link from "next/link";
import { Clock3, RefreshCw, ShoppingBag, Wrench } from "lucide-react";

interface ProductMaintenanceStateProps {
  onRetry?: () => void;
}

export function ProductMaintenanceState({
  onRetry,
}: ProductMaintenanceStateProps) {
  return (
    <main className="relative isolate flex min-h-[72vh] items-center overflow-hidden bg-slate-950 px-4 py-16 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.18),transparent_38%)]"
      />
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/25">
          <Wrench className="h-6 w-6" aria-hidden="true" />
        </div>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
          Түр засвар үйлчилгээ
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
          Онлайн барааны хэсэг шинэчлэгдэж байна
        </h1>
        <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
          Илүү найдвартай, хурдан худалдааны үйлчилгээг хүргэхээр системийн
          тохируулга хийж байна. Таны бүртгэл болон өмнөх захиалгын мэдээлэл
          хэвээр хадгалагдана.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
            <Clock3
              className="h-5 w-5 shrink-0 text-sky-300"
              aria-hidden="true"
            />
            <p className="text-sm font-bold text-slate-200">
              Үйлчилгээ удахгүй хэвийн болно
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
            <ShoppingBag
              className="h-5 w-5 shrink-0 text-emerald-300"
              aria-hidden="true"
            />
            <p className="text-sm font-bold text-slate-200">
              Таны мэдээлэл аюулгүй хадгалагдана
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-black text-slate-950 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Нүүр хуудас руу буцах
          </Link>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Дахин шалгах
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
