"use client";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { useSharedBasket } from "./useSharedBasket";
import { money } from "./types";
export function SharedBasket({
  basket,
  onCheckout,
}: {
  basket: ReturnType<typeof useSharedBasket>;
  onCheckout: () => void;
}) {
  return (
    <aside
      id="shared-basket"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <ShoppingBag size={18} className="text-orange-600" />
          Таны сагс
        </h2>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
          {basket.count}
        </span>
      </div>
      {!basket.lines.length ? (
        <div className="py-10 text-center">
          <ShoppingBag className="mx-auto mb-3 size-9 text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">
            Сагс тань хоосон байна
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Таалагдсан бараагаа сонгож
            <br />
            энд нэмээрэй.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {basket.lines[0].product.warehouse?.name}
          </p>
          <ul className="my-5 max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {basket.lines.map(({ product, quantity }) => (
              <li key={product.id} className="py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-5">{product.name}</p>
                  <button
                    onClick={() => basket.quantity(product.id, 0)}
                    aria-label={`${product.name} сагснаас хасах`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-slate-200">
                    <button
                      onClick={() => basket.quantity(product.id, quantity - 1)}
                      aria-label={`${product.name} тоог багасгах`}
                      className="flex size-9 items-center justify-center hover:bg-slate-50"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="min-w-6 text-center text-xs font-bold">
                      {quantity}
                    </span>
                    <button
                      onClick={() => basket.quantity(product.id, quantity + 1)}
                      disabled={quantity >= Math.floor(product.stock)}
                      aria-label={`${product.name} тоог нэмэх`}
                      className="flex size-9 items-center justify-center hover:bg-slate-50 disabled:text-slate-200"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="text-xs font-bold">
                    {money(Number(product.price) * quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">Нийт төлөх</span>
            <strong className="text-xl">{money(basket.total)}</strong>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            className="mt-4 min-h-12 w-full rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
          >
            Захиалах · {money(basket.total)}
          </button>
          <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">
            Minu QR · Төлбөрийн дараа захиалга баталгаажна.
            <br />
            Хүргэлтийн нөхцөлийг дэлгүүртэй тохиролцоно.
          </p>
        </>
      )}
    </aside>
  );
}
