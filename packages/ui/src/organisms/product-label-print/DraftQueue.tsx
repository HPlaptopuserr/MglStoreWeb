import { Minus, Plus, Trash2 } from "lucide-react";
import {
  PRICE_MODE_LABELS,
  type LabelPriceMode,
  type ProductLabelDraft,
} from "./layout";
interface Props {
  priceMode: LabelPriceMode;
  drafts: ProductLabelDraft[];
  updateDraft: (id: string, updates: Partial<ProductLabelDraft>) => void;
  updateQty: (id: string, qty: number) => void;
  removeDraft: (id: string) => void;
}
export function DraftQueue({
  drafts,
  priceMode,
  updateDraft,
  updateQty,
  removeDraft,
}: Props) {
  return (
    <section className="flex min-h-[260px] flex-col border-r lg:min-h-0 border-slate-200">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h4 className="text-sm font-black text-slate-950">Хэвлэх мөр</h4>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {drafts.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
            <p className="text-sm font-bold text-slate-500">
              Сонгосон бараа байхгүй
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.productId}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-slate-950">
                      {draft.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {draft.qty} шошго
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.productId)}
                    aria-label={`${draft.name} мөр устгах`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LabelInput
                    label="Нэр"
                    value={draft.name}
                    onChange={(value) =>
                      updateDraft(draft.productId, { name: value })
                    }
                    className="col-span-2"
                  />
                  <LabelInput
                    label="Код"
                    value={draft.code}
                    onChange={(value) =>
                      updateDraft(draft.productId, { code: value })
                    }
                  />
                  <LabelInput
                    label={PRICE_MODE_LABELS[priceMode]}
                    value={
                      priceMode === "wholesale"
                        ? draft.wholesalePriceText
                        : draft.priceText
                    }
                    onChange={(value) =>
                      updateDraft(
                        draft.productId,
                        priceMode === "wholesale"
                          ? { wholesalePriceText: value }
                          : { priceText: value },
                      )
                    }
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2 py-2">
                  <span className="text-xs font-bold text-slate-500">Тоо</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQty(draft.productId, draft.qty - 1)}
                      aria-label={`${draft.name} тоо бууруулах`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      value={draft.qty}
                      onChange={(event) =>
                        updateQty(draft.productId, Number(event.target.value))
                      }
                      inputMode="numeric"
                      className="h-8 w-14 rounded-lg border border-slate-200 bg-white text-center text-sm font-black tabular-nums text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      aria-label={`${draft.name} хэвлэх тоо`}
                    />
                    <button
                      type="button"
                      onClick={() => updateQty(draft.productId, draft.qty + 1)}
                      aria-label={`${draft.name} тоо нэмэх`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function LabelInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}
