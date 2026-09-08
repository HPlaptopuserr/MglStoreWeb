"use client";

import { useState } from "react";
import { PaymentConfirmationLog } from "./PaymentConfirmationLog";
import { API, wmsFetch } from "@/lib/api";
import type { RequestPayment, StockRequest } from "./stock-request.model";

const methods = { BANK_TRANSFER: "Дансаар", CARD: "Картаар", CASH: "Бэлнээр" };
const money = (amount: number) => `${amount.toLocaleString("mn-MN")} ₮`;

export function RequestPaymentPanel({ request, onSaved, onBusy }: {
  request: StockRequest;
  onSaved: (payment: RequestPayment) => void;
  onBusy: (busy: boolean) => void;
}) {
  const payment = request.payment;
  const remaining = payment ? Math.max(0, Number(payment.totalAmount) - Number(payment.paidAmount)) : 0;
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [amount, setAmount] = useState(String(remaining));
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [receipt, setReceipt] = useState<File | null>(null);
  async function downloadReceipt(id: string, name: string) {
    try {
      const response = await wmsFetch(`${API}/stock-requests/payment-receipts/${id}`);
      if (!response.ok) throw new Error("Баримт татах эрхгүй эсвэл серверт алдаа гарлаа");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Баримт татаж чадсангүй"); }
  }
  if (!payment) return <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Төлбөрийн нэхэмжлэх үүсээгүй байна.</p>;
  const canPay = remaining > 0 && !["REJECTED", "CANCELLED"].includes(request.status);
  async function save() {
    if (!payment || busy || !confirmed) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > remaining) {
      setError("Төлөлтийн дүн 0-ээс их, үлдэгдлээс хэтрэхгүй байх ёстой.");
      return;
    }
    setBusy(true); onBusy(true); setError(""); setSaved(false);
    try {
      const bodyData = new FormData();
      bodyData.set("paymentMethod", method);
      bodyData.set("paidAmount", String(Number(payment.paidAmount) + value));
      bodyData.set("transactionId", reference.trim());
      bodyData.set("note", "Агуулах: төлбөр хүлээн авсныг шалгаж бүртгэв");
      if (receipt) bodyData.set("receipt", receipt);
      const response = await wmsFetch(`${API}/stock-requests/payments/${payment.id}/confirm`, {
        method: "PATCH",
        body: bodyData,
      });
      const body: RequestPayment & { message?: string } = await response.json();
      if (!response.ok) throw new Error(body.message || "Төлөлт хадгалагдсангүй");
      onSaved(body); setSaved(true); setConfirmed(false); setReceipt(null); setReference("");
      setAmount(String(Math.max(0, Number(body.totalAmount) - Number(body.paidAmount))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Холболт тасарлаа. Дахин төлөлт бүртгэхээс өмнө хүсэлтийг шинэчилж шалгана уу.");
    } finally { setBusy(false); onBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
    <h4 className="font-bold text-slate-900">Төлбөрийн бүртгэл</h4>
    <dl className="grid grid-cols-3 gap-2 text-xs">
      {[['Нийт', Number(payment.totalAmount)], ['Төлсөн', Number(payment.paidAmount)], ['Үлдэгдэл', remaining]].map(([label, value]) =>
        <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-bold">{money(Number(value))}</dd></div>)}
    </dl>
    {payment.paymentMethod && <p className="text-xs text-slate-600">Сүүлийн төлөлтийн хэлбэр: {methods[payment.paymentMethod as keyof typeof methods] ?? payment.paymentMethod}</p>}
    {saved && <p role="status" className="text-sm text-emerald-700">Төлөлт бүртгэгдлээ.</p>}
    <PaymentConfirmationLog entries={payment.entries} onDownload={(id, name) => void downloadReceipt(id, name)} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {remaining === 0 && <p className="text-sm font-bold text-emerald-700">Бүрэн төлөгдсөн</p>}
    {canPay && <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
      <p className="text-xs text-slate-600">Дансны хуулга, картын баримт эсвэл хүлээн авсан бэлэн мөнгийг шалгасны дараа бүртгэнэ. Энэ үйлдэл мөнгө шилжүүлэхгүй.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Төлбөрийн хэлбэр<select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2">{Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm">Одоо хүлээн авсан дүн<input type="number" min="0.01" step="0.01" max={remaining} value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2" /></label>
      </div>
      <label className="block text-sm">Гүйлгээ / баримтын дугаар (заавал биш)<input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2" /></label>
      <label className="block text-sm">Падан / screenshot (заавал биш)<input key={String(payment.paidAmount)} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > 10 * 1024 * 1024) { setError("Зураг 10MB-аас бага байх ёстой"); e.target.value = ""; setReceipt(null); return; }
        setError(""); setReceipt(file);
      }} className="mt-1 block w-full rounded-lg border bg-white p-2" /><span className="text-xs text-slate-500">JPG, PNG, WebP, GIF · 10MB хүртэл</span></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />Төлбөр бодитоор орсныг шалгасан</label>
      <button type="button" disabled={!confirmed || busy} onClick={() => void save()} className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50">{busy ? "Бүртгэж байна…" : "Төлөлт бүртгэх"}</button>
    </fieldset>}
  </section>;
}
