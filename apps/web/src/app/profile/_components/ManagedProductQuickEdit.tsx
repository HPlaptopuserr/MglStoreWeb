"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import type { ManagedProduct } from "./managed-product.types";
import {
  buildQuickProductPatch,
  productCurrency,
  productPrice,
} from "./managed-product-display";

export function ManagedProductQuickEdit({
  product,
  onClose,
  onSaved,
}: {
  product: ManagedProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { authFetch } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [price, setPrice] = useState(String(productPrice(product) ?? ""));
  const [stock, setStock] = useState(String(product.stock ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useLockBodyScroll(true);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    try {
      const patch = buildQuickProductPatch(product, price, stock);
      if (!Object.keys(patch).length) {
        onClose();
        return;
      }
      submitting.current = true;
      setSaving(true);
      const response = await authFetch(
        `${API}/products/${encodeURIComponent(product.id)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(
          data &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
            ? data.message
            : "Өөрчлөлтийг хадгалж чадсангүй.",
        );
      }
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Сүлжээний алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="quick-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="quick-edit-title" className="text-xl font-black">
            Үнэ, нөөц засах
          </h2>
          <p className="mt-2 text-sm text-slate-500">{product.name}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          aria-label="Хаах"
          className="rounded-xl p-2 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-orange-100"
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={save} className="mt-5 space-y-4">
        <label className="block text-sm font-bold">
          Үнэ ({productCurrency(product)})
          <input
            autoFocus
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            disabled={saving}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-4 focus:ring-orange-100"
          />
        </label>
        {product.supplyType === "CHINA_PREORDER" ? (
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
            Захиалгын бараа. Хугацаа, захиалгын багтаамжийг “Засах” хэсгээс
            өөрчилнө.
          </p>
        ) : (
          <label className="block text-sm font-bold">
            Нөөц ({product.unit === "kg" ? "кг" : "ширхэг"})
            <input
              required
              type="number"
              min="0"
              step={product.unit === "kg" ? "0.001" : "1"}
              value={stock}
              disabled={saving}
              onChange={(event) => setStock(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-4 focus:ring-orange-100"
            />
          </label>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 px-4 font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 font-bold text-white hover:bg-orange-700 focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
