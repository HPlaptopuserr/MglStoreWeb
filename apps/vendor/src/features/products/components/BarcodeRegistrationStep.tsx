"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Barcode, Loader2, Tag } from "lucide-react";
import { API, authFetch } from "@/lib/api";
import type { Product } from "../types";

interface Props {
  organizationId: string;
  initialBarcode: string;
  onContinue: (barcode: string) => void;
  onOpenExisting?: (product: Product) => void;
}

export function BarcodeRegistrationStep({ organizationId, initialBarcode, onContinue, onOpenExisting }: Props) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<Product | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function checkBarcode(event: React.FormEvent) {
    event.preventDefault();
    const value = barcode.trim();
    if (!value || loading) return;
    if (!organizationId) { setError("Дэлгүүрийн мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү."); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(""); setExisting(null);
    try {
      const params = new URLSearchParams({ organizationId, barcode: value });
      const response = await authFetch(`${API}/products/registration/barcode?${params}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Баркод шалгаж чадсангүй. Дахин оролдоно уу.");
      const result = await response.json() as { product: Product | null };
      if (controller.signal.aborted) return;
      if (result.product) setExisting(result.product);
      else onContinue(value);
    } catch {
      if (!controller.signal.aborted) setError("Баркод шалгаж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <form onSubmit={checkBarcode} className="space-y-5 p-5 sm:p-6" aria-busy={loading}>
      <ol aria-label="Бүртгэлийн алхам" className="flex items-center gap-3 text-xs font-semibold">
        <li aria-current="step" className="flex items-center gap-2 text-indigo-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">1</span> Баркод шалгах</li>
        <li aria-hidden className="h-px flex-1 bg-slate-200" />
        <li className="flex items-center gap-2 text-slate-400"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">2</span> Мэдээлэл оруулах</li>
      </ol>
      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 ring-1 ring-slate-200"><Barcode aria-hidden size={23} /></div>
        <div><h3 className="font-semibold text-slate-900">Баркодоо уншуулах эсвэл бичнэ үү</h3><p id="barcode-help" className="mt-1 text-sm leading-5 text-slate-500">Танай бүртгэлд байгаа эсэхийг шалгаад, нэгдсэн сангаас тохирох барааг санал болгоно.</p></div>
      </div>
      <div><label htmlFor="registration-barcode" className="mb-2 block text-sm font-semibold">Баркод</label><input id="registration-barcode" aria-describedby="barcode-help barcode-keyboard-help" autoFocus autoComplete="off" spellCheck={false} required maxLength={128} disabled={loading} value={barcode} onChange={(event) => { setBarcode(event.target.value); setExisting(null); setError(""); }} className="h-12 w-full rounded-xl border border-slate-300 px-4 font-mono text-base tracking-wide text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50" placeholder="Жишээ: 865604212512" /><p id="barcode-keyboard-help" className="mt-2 text-xs text-slate-500">Уншуулсны дараа Enter дарж үргэлжлүүлнэ.</p></div>
      <div aria-live="polite">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {existing && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-900">Танай дэлгүүрт бүртгэлтэй байна</p><p className="text-sm text-amber-800">{existing.name}{!existing.isActive ? " · Идэвхгүй" : ""}</p><p className="text-sm text-amber-800">Давхар бараа үүсгэх шаардлагагүй. Үлдэгдэл нэмэх бол барааны орлого бүртгэнэ үү.</p>{onOpenExisting && <button type="button" onClick={() => onOpenExisting(existing)} className="font-semibold text-indigo-700 underline underline-offset-4">Бүртгэлтэй барааг нээх</button>}</div>}
      </div>
      <button disabled={loading || !barcode.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50">{loading && <Loader2 size={18} className="animate-spin" />}{loading ? "Шалгаж байна…" : "Шалгаад үргэлжлүүлэх"}{!loading && <ArrowRight aria-hidden size={17} />}</button>
      <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-100" />эсвэл<span className="h-px flex-1 bg-slate-100" /></div>
      <button type="button" disabled={loading} onClick={() => onContinue("")} className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:opacity-50">
        <Tag aria-hidden size={20} className="shrink-0 text-slate-400 group-hover:text-indigo-600" />
        <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Баркодгүй бараа</span><span className="mt-0.5 block text-xs text-slate-500">Нэрээ оруулахад SKU код үүснэ</span></span>
        <ArrowRight aria-hidden size={17} className="text-slate-400 group-hover:text-indigo-600" />
      </button>
    </form>
  );
}
