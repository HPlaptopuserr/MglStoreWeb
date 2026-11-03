"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, Package, Plus } from "lucide-react";
import { money, type SharedProduct } from "./types";
export function SharedProductCard({
  product,
  quantity,
  onAdd,
  onDetail,
}: {
  product: SharedProduct;
  quantity: number;
  onAdd: () => void;
  onDetail: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const available = product.orderable && product.stock >= 1;
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-3 transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5 motion-reduce:transform-none sm:p-4">
      <button
        type="button"
        onClick={onDetail}
        className="relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50 focus-visible:outline-2 focus-visible:outline-orange-600"
        aria-label={`${product.name} дэлгэрэнгүй`}
      >
        {product.images[0]?.url && !imageFailed ? (
          <Image
            src={product.images[0].url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 250px"
            className="object-contain p-4 transition duration-300 group-hover:scale-105 motion-reduce:transform-none"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Package className="size-14 text-slate-200" strokeWidth={1} />
        )}
        <span
          className={`absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold shadow-sm ${product.stock < 5 ? "text-amber-700" : "text-emerald-700"}`}
        >
          {product.stock >= 1
            ? product.stock < 5
              ? `Цөөн үлдсэн · ${product.stock}`
              : "Бэлэн байна"
            : "Түр дууссан"}
        </span>
      </button>
      <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {product.businessCategory?.name || "Дундын дэлгүүр"}
      </p>
      <button
        type="button"
        onClick={onDetail}
        className="line-clamp-2 min-h-10 text-left text-sm font-bold leading-5 text-slate-900 hover:text-orange-700 focus-visible:outline-orange-600"
      >
        {product.name}
      </button>
      <div className="mt-auto pt-4">
        <p className="text-lg font-black tracking-tight text-slate-950">
          {money(product.price)}
          <span className="ml-1 text-[10px] font-medium text-slate-400">
            / {product.unit === "pcs" ? "ш" : product.unit || "ш"}
          </span>
        </p>
        <button
          type="button"
          onClick={onAdd}
          disabled={!available || quantity >= Math.floor(product.stock)}
          className={`mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${quantity ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-orange-500 text-white hover:bg-orange-600"}`}
        >
          {quantity ? <Check size={16} /> : <Plus size={16} />}
          {!product.orderable
            ? "Түр захиалах боломжгүй"
            : product.stock < 1
              ? "Нөөц дууссан"
              : quantity
                ? `Сагсанд ${quantity} · Нэмэх`
                : "Сагсанд нэмэх"}
        </button>
      </div>
    </article>
  );
}
