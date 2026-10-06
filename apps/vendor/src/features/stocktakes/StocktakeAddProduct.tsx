"use client";
import { useEffect, useRef, useState } from "react";
import type { StocktakeNewProduct } from "@mgl/types";
import { buttonClass, fieldClass, secondaryClass } from "./StocktakeOverview";

export function StocktakeAddProduct({ registers, barcode, busy, dirty, onAdd, onDone }: {
  registers: { id: string; name: string }[];
  barcode: string;
  busy: boolean;
  dirty: boolean;
  onAdd: (product: StocktakeNewProduct) => Promise<boolean>;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"pcs" | "kg">("pcs");
  const requestId = useRef("");
  const pending = useRef(false);
  const barcodeInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (barcode) setOpen(true); }, [barcode]);
  useEffect(() => { if (open && barcodeInput.current && barcode) barcodeInput.current.value = barcode; }, [open, barcode]);
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-emerald-950">Тооллогоор илэрсэн бүртгэлгүй бараа</h3>
          <p className="mt-1 text-sm text-slate-600">Баталгаажуулахад үлдэгдэл орж, хүлээн авалтын баримт үүснэ.</p>
        </div>
        <button type="button" disabled={busy} aria-expanded={open} onClick={() => setOpen(!open)} className={secondaryClass}>
          {open ? "Хураах" : "+ Шинэ бараа бүртгэх"}
        </button>
      </div>
      {open && (
        <form className="mt-4 space-y-4" onSubmit={async event => {
          event.preventDefault();
          if (busy || dirty || pending.current || !registers.length) return;
          const form = event.currentTarget;
          const data = new FormData(form);
          requestId.current ||= crypto.randomUUID();
          pending.current = true;
          try {
            const ok = await onAdd({
              id: requestId.current, name: String(data.get("name") || ""), barcode: String(data.get("barcode") || ""),
              unit, quantity: Number(data.get("quantity")), salePrice: Number(data.get("salePrice")),
              unitCost: Number(data.get("unitCost")), registerId: String(data.get("registerId") || ""),
            });
            if (ok) { requestId.current = ""; form.reset(); setUnit("pcs"); setOpen(false); onDone(); }
          } finally { pending.current = false; }
        }}>
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Барааны нэр<input name="name" required maxLength={200} className={fieldClass} /></label>
            <label className="text-sm font-medium">Баркод (заавал биш)<input ref={barcodeInput} name="barcode" defaultValue={barcode} maxLength={100} className={fieldClass} /></label>
            <label className="text-sm font-medium">Хэмжих нэгж<select value={unit} onChange={e => setUnit(e.target.value as "pcs" | "kg")} className={fieldClass}><option value="pcs">Ширхэг</option><option value="kg">Килограмм</option></select></label>
            <label className="text-sm font-medium">Бодит тоо ({unit === "kg" ? "кг" : "ш"})<input name="quantity" type="number" required min={unit === "kg" ? 0.001 : 1} step={unit === "kg" ? 0.001 : 1} className={fieldClass} /></label>
            <label className="text-sm font-medium">Нэгжийн өртөг (₮)<input name="unitCost" type="number" required min={0} max={1000000000} step="0.01" className={fieldClass} /></label>
            <label className="text-sm font-medium">Зарах үнэ (₮)<input name="salePrice" type="number" required min={0} max={1000000000} step="0.01" className={fieldClass} /></label>
            <label className="text-sm font-medium sm:col-span-2">Хүлээн авалтын баримт бүртгэх касс<select name="registerId" required defaultValue={registers.length === 1 ? registers[0]!.id : ""} className={fieldClass}><option value="">Касс сонгох</option>{registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          </fieldset>
          {!registers.length && <p role="status" className="text-sm text-amber-800">Баримт бүртгэх идэвхтэй POS касс шаардлагатай.</p>}
          {dirty && <p role="status" className="text-sm text-amber-800">Бараа нэмэхээс өмнө тоолсон тоонуудаа «Хадгалах» товчоор хадгална уу.</p>}
          <button className={buttonClass} disabled={busy || dirty || !registers.length}>{busy ? "Хадгалж байна…" : "Тооллогод бараа нэмэх"}</button>
        </form>
      )}
    </section>
  );
}
