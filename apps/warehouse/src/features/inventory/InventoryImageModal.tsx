"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { API, wmsFetch } from "@/lib/api";

interface Props {
  warehouseId: string;
  productId: string;
  productName: string;
  onSaved: (images: { id: string; url: string }[]) => void;
  onClose: () => void;
}
export function InventoryImageModal({
  warehouseId,
  productId,
  productName,
  onSaved,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(next?: File) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("JPG, PNG эсвэл WebP зураг сонгоно уу.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("Зургийн хэмжээ 5 MB-аас бага байна.");
      return;
    }
    setError("");
    setFile(next);
  }
  async function save() {
    if (!file || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      let url = uploaded.current?.file === file ? uploaded.current.url : "";
      if (!url) {
        const body = new FormData();
        body.append("image", file);
        const response = await wmsFetch(`${API}/products/upload-image`, {
          method: "POST",
          body,
        });
        const result = (await response.json()) as {
          url?: string;
          message?: string;
        };
        if (!response.ok || !result.url)
          throw new Error(result.message || "Зураг upload хийж чадсангүй.");
        url = result.url;
        uploaded.current = { file, url };
      }
      const response = await wmsFetch(
        `${API}/warehouses/${encodeURIComponent(warehouseId)}/inventory/${encodeURIComponent(productId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ images: [url] }),
        },
      );
      const result = (await response.json()) as {
        product?: { images?: { id: string; url: string }[] };
        message?: string;
      };
      if (!response.ok)
        throw new Error(result.message || "Зураг хадгалж чадсангүй.");
      if (!result.product?.images?.length)
        throw new Error(
          "Хадгалсан зургийн мэдээлэл ирсэнгүй. Дахин оролдоно уу.",
        );
      onSaved(result.product.images);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Холболт тасарлаа. Дахин оролдоно уу.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="inventory-image-title"
      onCancel={(event) => {
        if (saving) event.preventDefault();
        else onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border-0 bg-white p-5 shadow-2xl backdrop:bg-slate-900/40"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="inventory-image-title" className="font-bold text-slate-900">
            Зураг нэмэх
          </h2>
          <p className="mt-1 truncate text-sm text-slate-500">{productName}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          aria-label="Хаах"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </header>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => input.current?.click()}
        className="mt-4 flex h-48 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {preview ? (
          <Image
            width={320}
            height={192}
            unoptimized
            src={preview}
            alt="Сонгосон зургийн урьдчилсан харагдац"
            className="h-full w-full object-contain"
          />
        ) : (
          <>
            <ImagePlus size={28} className="text-slate-400" />
            <span>Зураг сонгох</span>
          </>
        )}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        JPG, PNG, WebP · 5 MB хүртэл{file ? " · Зураг дээр дарж солино" : ""}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600"
        >
          {error}
        </p>
      )}
      <footer className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
        >
          Болих
        </button>
        <button
          type="button"
          disabled={!file || saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </footer>
    </dialog>
  );
}
