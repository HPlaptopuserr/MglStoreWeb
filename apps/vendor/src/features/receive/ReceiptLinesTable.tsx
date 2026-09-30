"use client";

import { Fragment } from "react";
import { Trash2 } from "lucide-react";
import { normalizePosMeasureUnit, POS_WEIGHT_STEP_KG } from "@mgl/types";
import type { ProductOption, ReceiptLine } from "./receipt-types";

type LotField = "unitCost" | "salePrice" | "batchNumber" | "expiryDate";
interface Props {
  lines: ReceiptLine[];
  total: number;
  onQuantity: (id: string, value: number) => void;
  onField: (id: string, field: LotField, value: string) => void;
  onRemove: (id: string) => void;
  onAddLot: (product: ProductOption) => void;
  onAutomaticPrice: (id: string) => void;
}
const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 });
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

export function ReceiptLinesTable({ lines, total, onQuantity, onField, onRemove, onAddLot, onAutomaticPrice }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-xs text-slate-500"><span>{lines.length} мөр · Тоо, өртгөө мөр бүрд оруулна уу</span><span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">Ноорог</span></div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Баримтын барааны хүснэгт">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">Хүлээн авах бараа, тоо хэмжээ, нэгж өртөг ба нийт дүн</caption>
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>{["№", "Барааны нэр / код", "Нэгж", "Тоо", "Авсан үнэ ₮", "Нийт өртөг ₮", "Зарах үнэ ₮", ""].map((title, index) => <th scope="col" key={index} className="border-b border-slate-200 px-3 py-3 text-left font-semibold">{title || <span className="sr-only">Үйлдэл</span>}</th>)}</tr></thead>
          <tbody>
            {lines.map((line, index) => {
              const unit = normalizePosMeasureUnit(line.product.unit);
              const cost = Number(line.unitCost);
              return <Fragment key={line.id}>
                <tr className="border-t border-slate-200 align-top transition hover:bg-slate-50/70">
                  <td className="px-3 py-4 text-slate-400">{index + 1}</td>
                  <td className="min-w-48 max-w-xs px-3 py-3"><p className="font-semibold text-slate-900">{line.product.name}</p><p className="mt-1 text-xs text-slate-500">{line.product.barcode || line.product.sku || "Кодгүй"}</p></td>
                  <td className="px-3 py-4 text-slate-500">{unit === "kg" ? "кг" : "ш"}</td>
                  <td className="w-24 px-2 py-3"><input aria-label={`${line.product.name} тоо`} type="number" min={unit === "kg" ? POS_WEIGHT_STEP_KG : 1} max={1000000} step={unit === "kg" ? POS_WEIGHT_STEP_KG : 1} value={line.quantity} onChange={event => onQuantity(line.id, Number(event.target.value))} className={inputClass} /></td>
                  <td className="w-32 px-2 py-3"><input aria-label={`${line.product.name} нэгж авсан үнэ`} required type="number" min="0" max="1000000000" step="0.01" placeholder="Оруулах" value={line.unitCost} onChange={event => onField(line.id, "unitCost", event.target.value)} className={inputClass} /></td>
                  <td className="whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums">{line.unitCost.trim() && Number.isFinite(cost) ? money.format(cost * line.quantity) : "—"}</td>
                  <td className="w-32 px-2 py-3"><input aria-label={`${line.product.name} зарах үнэ`} type="number" min="0" max="1000000000" step="0.01" placeholder="Өөрчлөхгүй" value={line.salePrice} onChange={event => onField(line.id, "salePrice", event.target.value)} className={inputClass} />{line.manualPrice && <button type="button" onClick={() => onAutomaticPrice(line.id)} className="mt-1 text-xs text-cyan-700 underline">Автоматаар бодох</button>}</td>
                  <td className="px-2 py-3"><button type="button" aria-label={`${line.product.name} мөрийг хасах`} onClick={() => onRemove(line.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-300"><Trash2 size={16} /></button></td>
                </tr>
                <tr><td colSpan={8} className="px-4 pb-3"><details className="text-xs text-slate-500"><summary className="w-fit cursor-pointer hover:text-cyan-700">Багц, дуусах хугацаа{line.batchNumber || line.expiryDate ? ` · ${[line.batchNumber, line.expiryDate].filter(Boolean).join(" · ")}` : " · Заавал биш"}</summary><div className="mt-3 flex flex-wrap items-end gap-3"><label>Багцын дугаар<input className={inputClass} maxLength={80} value={line.batchNumber} onChange={event => onField(line.id, "batchNumber", event.target.value)} /></label><label>Дуусах хугацаа<input className={inputClass} type="date" value={line.expiryDate} onChange={event => onField(line.id, "expiryDate", event.target.value)} /></label><button type="button" onClick={() => onAddLot(line.product)} className="rounded-lg border border-cyan-200 px-3 py-2.5 font-semibold text-cyan-700 hover:bg-cyan-50">+ Өөр үнэ / хугацаатай багц</button></div></details></td></tr>
              </Fragment>;
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50"><tr><th scope="row" colSpan={5} className="px-4 py-4 text-right">Нийт авсан өртөг</th><td className="whitespace-nowrap px-3 py-4 text-right font-bold tabular-nums">{money.format(total)} ₮</td><td colSpan={2} /></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
