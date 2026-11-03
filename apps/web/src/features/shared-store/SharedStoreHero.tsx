"use client";
import { useState } from "react";
import {
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { StoreDialog } from "./StoreDialog";
import type { SharedWarehouse } from "./types";
export function SharedStoreHero({
  total,
  warehouse,
  onBasket,
  count,
}: {
  total: number;
  warehouse?: SharedWarehouse;
  onBasket: () => void;
  count: number;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-orange-300 sm:size-20">
          <Store size={34} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Дундын дэлгүүр
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Бэлэн барааны худалдаа
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {warehouse?.name || "Агуулахаас шууд · MGL Store"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-orange-500" />
              {total} барааны сонголт
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Minu QR төлбөр
            </span>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="flex min-h-6 items-center gap-1.5 text-slate-600 hover:text-orange-600 focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <QrCode size={14} className="text-orange-500" />
              QR-аар дэлгүүр нээх
            </button>
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {warehouse?.phone && (
            <a
              href={`tel:${warehouse.phone}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Phone size={16} />
              Холбогдох
            </a>
          )}
          <button
            onClick={onBasket}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-bold text-white transition hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
          >
            <ShoppingBag size={16} />
            Сагс{" "}
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {count}
            </span>
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="rounded-lg bg-orange-50 px-3 py-2 font-bold text-orange-700">
          Агуулахын шууд худалдаа
        </span>
        {warehouse?.address && (
          <span className="flex items-start gap-1.5 leading-5">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            {warehouse.address}
          </span>
        )}
      </div>
      {qrOpen && (
        <StoreDialog
          title="QR-аар дэлгүүр нээх"
          onClose={() => setQrOpen(false)}
        >
          <div className="flex flex-col items-center gap-5">
            <QrGenerator
              value={`${window.location.origin}/shared-store`}
              size={220}
            />
            <p className="text-center text-sm text-slate-500">
              QR кодыг уншуулж Дундын дэлгүүрийн барааг хараарай.
            </p>
          </div>
        </StoreDialog>
      )}
    </section>
  );
}
