"use client";
import { useEffect, useRef, useState } from "react";
import type { StocktakeNewProduct } from "@mgl/types";
import { buttonClass, fieldClass, secondaryClass } from "./StocktakeOverview";

export function StocktakeAddProduct({
  registers,
  seed,
  busy,
  dirty,
  onAdd,
  onDone,
}: {
  registers: { id: string; name: string }[];
  seed: { name: string; barcode: string } | null;
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
  const nameInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (seed) setOpen(true);
  }, [seed]);
  useEffect(() => {
    if (open && seed) {
      if (barcodeInput.current) barcodeInput.current.value = seed.barcode;
      if (nameInput.current) nameInput.current.value = seed.name;
      nameInput.current?.focus();
    }
  }, [open, seed]);
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-emerald-950">
            Тооллогоор илэрсэн бүртгэлгүй бараа
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Бүртгэхэд үлдэгдэл орж, өнөөдрийн хүлээн авалтын баримт шууд үүснэ.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          aria-expanded={seed ? undefined : open}
          onClick={() => (seed ? onDone() : setOpen(!open))}
          className={secondaryClass}
        >
          {seed ? "Буцах" : open ? "Хураах" : "+ Шинэ бараа бүртгэх"}
        </button>
      </div>
      <div hidden={!open}>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || pending.current || !registers.length) return;
            setError("");
            const form = event.currentTarget;
            const data = new FormData(form);
            requestId.current ||= crypto.randomUUID();
            pending.current = true;
            try {
              const ok = await onAdd({
                id: requestId.current,
                name: String(data.get("name") || ""),
                barcode: String(data.get("barcode") || ""),
                unit,
                quantity: Number(data.get("quantity")),
                salePrice: Number(data.get("salePrice")),
                unitCost: Number(data.get("unitCost")),
                registerId: String(data.get("registerId") || ""),
              });
              if (!ok)
                setError(
                  "Бараа нэмэгдсэнгүй. Дээрх алдааны мэдээллийг шалгаад дахин оролдоно уу.",
                );
              if (ok) {
                requestId.current = "";
                form.reset();
                setUnit("pcs");
                setOpen(false);
                onDone();
              }
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Бараа бүртгэж чадсангүй. Дахин оролдоно уу.",
              );
            } finally {
              pending.current = false;
            }
          }}
        >
          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Барааны нэр
              <input
                ref={nameInput}
                name="name"
                required
                maxLength={200}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Баркод (заавал биш)
              <input
                ref={barcodeInput}
                name="barcode"
                defaultValue={seed?.barcode ?? ""}
                maxLength={100}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Хэмжих нэгж
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "pcs" | "kg")}
                className={fieldClass}
              >
                <option value="pcs">Ширхэг</option>
                <option value="kg">Килограмм</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Бодит тоо ({unit === "kg" ? "кг" : "ш"})
              <input
                name="quantity"
                type="number"
                required
                min={unit === "kg" ? 0.001 : 1}
                step={unit === "kg" ? 0.001 : 1}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Нэгжийн өртөг (₮)
              <input
                name="unitCost"
                type="number"
                required
                min={0}
                max={1000000000}
                step="0.01"
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium">
              Зарах үнэ (₮)
              <input
                name="salePrice"
                type="number"
                required
                min={0}
                max={1000000000}
                step="0.01"
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Хүлээн авалтын баримт бүртгэх касс
              <select
                name="registerId"
                required
                defaultValue={registers.length === 1 ? registers[0]!.id : ""}
                className={fieldClass}
              >
                <option value="">Касс сонгох</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          {!registers.length && (
            <p role="status" className="text-sm text-amber-800">
              Баримт бүртгэх идэвхтэй POS касс шаардлагатай.
            </p>
          )}
          {dirty && (
            <p role="status" className="text-sm text-amber-800">
              Бараа нэмэхэд тоолсон өөрчлөлтүүд эхлээд автоматаар хадгалагдана.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          <button className={buttonClass} disabled={busy || !registers.length}>
            {busy ? "Хадгалж байна…" : "Тооллогод бараа нэмэх"}
          </button>
        </form>
      </div>
    </section>
  );
}
