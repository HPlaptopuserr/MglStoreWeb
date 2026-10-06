"use client";
import { useEffect, useRef, useState } from "react";
import type { PosProduct } from "../types/pos.types";
import { API, authFetch } from "@/lib/api";
import { normalizePosMeasureUnit } from "@mgl/types";
import { notifyProductCatalogChanged } from "@/lib/product-catalog-events";

export function RestockProductDialog({ product, registerId, onClose, onRestocked }: {
  product: PosProduct; registerId?: string; onClose: () => void;
  onRestocked: (product: PosProduct) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const attempt = useRef<{ id: string; quantity: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState("");
  const [retrying, setRetrying] = useState(false);
  const kg = normalizePosMeasureUnit(product.measureUnit) === "kg";
  const storageKey = `pos-restock:${registerId}:${product.id}`;
  useEffect(() => {
    dialog.current?.showModal();
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (raw && typeof raw === "object" && "id" in raw && typeof raw.id === "string" && "quantity" in raw && typeof raw.quantity === "number") {
        attempt.current = { id: raw.id, quantity: raw.quantity };
        setQuantity(String(raw.quantity)); setRetrying(true);
      }
    } catch { /* Retry identity is also kept in memory for this dialog. */ }
  }, [storageKey]);
  return <dialog ref={dialog} aria-labelledby="restock-product-title"
    onCancel={e => { e.preventDefault(); if (!pending.current) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">{product.stockQty <= 0 ? "Дууссан" : "Нөөц хүрэлцэхгүй"}</span>
    <h2 id="restock-product-title" className="mt-3 text-lg font-bold">{product.name}</h2>
    <p className="mt-1 text-sm text-slate-500">{product.barcode || product.sku} · ₮{product.price.toLocaleString()}</p>
    <p className="mt-2 text-sm">Одоогийн нөөц: <strong>{product.stockQty} {kg ? "кг" : "ш"}</strong></p>
    <form className="mt-4 space-y-3" onSubmit={async e => {
      e.preventDefault();
      if (pending.current || !registerId) return;
      const amount = Number(quantity);
      if (!Number.isFinite(amount) || amount <= 0) return;
      attempt.current ||= { id: crypto.randomUUID(), quantity: amount };
      try { sessionStorage.setItem(storageKey, JSON.stringify(attempt.current)); } catch { /* In-memory retry remains available. */ }
      pending.current = true; setBusy(true); setError(""); setRetrying(true);
      try {
        const response = await authFetch(`${API}/pos/quick-restock`, { method: "POST",
          body: JSON.stringify({ requestId: attempt.current.id, registerId, productId: product.id, quantity: attempt.current.quantity }) });
        const data = await response.json() as { stockQty?: number; message?: string };
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) { attempt.current = null; setRetrying(false); sessionStorage.removeItem(storageKey); }
          throw new Error(data.message || "Орлого бүртгэж чадсангүй");
        }
        if (typeof data.stockQty !== "number") throw new Error("Үлдэгдлийн хариу буруу байна. Дахин оролдоно уу.");
        sessionStorage.removeItem(storageKey);
        notifyProductCatalogChanged();
        onRestocked({ ...product, stockQty: data.stockQty });
      } catch (err) { setError(err instanceof Error ? err.message : "Холболтын алдаа. Дахин оролдоно уу."); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <label className="block text-sm font-semibold">Нэмэх бодит нөөц ({kg ? "кг" : "ш"})
        <input autoFocus type="number" required min={kg ? 0.001 : 1} max={1000000} step={kg ? 0.001 : 1}
          value={quantity} disabled={busy || retrying} onChange={e => setQuantity(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
      </label>
      <p className="text-xs leading-5 text-slate-500">Нэмсэн тоо орлогын баримтад бүртгэгдэнэ. Дараа нь барааг сагсанд нэмнэ.</p>
      {!registerId && <p role="alert" className="text-sm text-amber-800">Эхлээд POS кассаа сонгоно уу.</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border px-3 py-2.5 text-sm font-semibold hover:bg-slate-50">Болих</button>
        <button disabled={busy || !registerId} className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{busy ? "Хадгалж байна…" : retrying ? "Дахин шалгаж үргэлжлүүлэх" : "Нөөц нэмээд үргэлжлүүлэх"}</button>
      </div>
    </form>
  </dialog>;
}
