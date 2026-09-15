"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { API, wmsFetch } from "@/lib/api";

type Receipt = {
  id: string;
  receiptNumber: string;
  supplierName: string;
  supplierRegisterNumber: string | null;
  supplierDocumentNumber: string | null;
  documentDate: string | null;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancellationReason: string | null;
  warehouse: { id: string; name: string };
  createdBy: {
    email: string;
    profile: { fullName: string | null } | null;
  };
  confirmedBy: {
    email: string;
    profile: { fullName: string | null } | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitCost: string | number;
    batchNumber: string | null;
    expiryDate: string | null;
    location: string | null;
    product: {
      name: string;
      sku: string | null;
      barcode: string | null;
      unit: string | null;
    };
  }>;
};

const statusLabel: Record<Receipt["status"], string> = {
  DRAFT: "НООРОГ",
  CONFIRMED: "БАТАЛГААЖСАН",
  CANCELLED: "ЦУЦЛАГДСАН",
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("mn-MN") : "—";
}

export default function GoodsReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void wmsFetch(`${API}/warehouse-goods-receipts/${id}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | Receipt
          | { message?: string }
          | null;
        if (!response.ok) {
          throw new Error(
            payload && "message" in payload && payload.message
              ? payload.message
              : "Орлогын падаан авахад алдаа гарлаа",
          );
        }
        setReceipt(payload as Receipt);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Алдаа гарлаа",
          );
        }
      });
    return () => controller.abort();
  }, [id]);

  const totals = useMemo(() => {
    if (!receipt) return { quantity: 0, amount: 0 };
    return receipt.items.reduce(
      (total, item) => ({
        quantity: total.quantity + item.quantity,
        amount: total.amount + item.quantity * Number(item.unitCost),
      }),
      { quantity: 0, amount: 0 },
    );
  }, [receipt]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        >
          {error}
        </div>
      </main>
    );
  }

  if (!receipt) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Падаан ачаалж байна…
      </main>
    );
  }

  const createdBy =
    receipt.createdBy.profile?.fullName || receipt.createdBy.email;
  const confirmedBy =
    receipt.confirmedBy?.profile?.fullName || receipt.confirmedBy?.email || "—";

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 print:bg-white print:p-0 sm:p-8">
      <div className="mx-auto mb-4 flex max-w-5xl justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Буцах
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Printer className="h-4 w-4" /> Хэвлэх
        </button>
      </div>

      <article className="mx-auto max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-10">
        <header className="flex flex-col justify-between gap-5 border-b-2 border-slate-900 pb-6 sm:flex-row">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              MGL WMS
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Бараа хүлээн авсан падаан
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Агуулахын орлогын баримт
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-xl font-bold">
              {receipt.receiptNumber}
            </p>
            <p className="mt-2 text-sm">{statusLabel[receipt.status]}</p>
            <p className="mt-1 text-sm text-slate-500">
              Үүссэн: {formatDate(receipt.createdAt)}
            </p>
          </div>
        </header>

        <section className="grid gap-5 border-b border-slate-200 py-6 sm:grid-cols-2">
          <InfoGroup
            title="Нийлүүлэгч"
            rows={[
              ["Нэр", receipt.supplierName],
              ["Регистр", receipt.supplierRegisterNumber || "—"],
              ["Нийлүүлэгчийн падаан", receipt.supplierDocumentNumber || "—"],
              ["Падааны огноо", formatDate(receipt.documentDate)],
            ]}
          />
          <InfoGroup
            title="Хүлээн авагч"
            rows={[
              ["Агуулах", receipt.warehouse.name],
              ["Бүртгэсэн", createdBy],
              ["Баталгаажуулсан", confirmedBy],
              ["Баталгаажсан огноо", formatDate(receipt.confirmedAt)],
            ]}
          />
        </section>

        <div className="overflow-x-auto py-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-left">
                <th className="p-2">№</th>
                <th className="p-2">Бараа</th>
                <th className="p-2">SKU / баркод</th>
                <th className="p-2 text-right">Тоо</th>
                <th className="p-2 text-right">Өртөг</th>
                <th className="p-2 text-right">Дүн</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200 align-top"
                >
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2 font-medium">
                    {item.product.name}
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      Batch: {item.batchNumber || "—"} · Дуусах:{" "}
                      {formatDate(item.expiryDate)} · Байрлал:{" "}
                      {item.location || "—"}
                    </p>
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {item.product.sku || "—"}
                    <br />
                    {item.product.barcode || "—"}
                  </td>
                  <td className="p-2 text-right">
                    {item.quantity.toLocaleString()} {item.product.unit || "ш"}
                  </td>
                  <td className="p-2 text-right">
                    {Number(item.unitCost).toLocaleString()}₮
                  </td>
                  <td className="p-2 text-right font-semibold">
                    {(item.quantity * Number(item.unitCost)).toLocaleString()}₮
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-bold">
                <td colSpan={3} className="p-3 text-right">
                  Нийт
                </td>
                <td className="p-3 text-right">
                  {totals.quantity.toLocaleString()}
                </td>
                <td />
                <td className="p-3 text-right">
                  {totals.amount.toLocaleString()}₮
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {receipt.note && (
          <p className="border-t border-slate-200 py-4 text-sm">
            <strong>Тэмдэглэл:</strong> {receipt.note}
          </p>
        )}
        {receipt.status === "CANCELLED" && (
          <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <strong>Цуцалсан:</strong>{" "}
            {receipt.cancellationReason || "Шалтгаан бичигдээгүй"}
          </p>
        )}

        <footer className="mt-16 grid grid-cols-2 gap-12 text-sm">
          <Signature label="Хүлээлгэн өгсөн" />
          <Signature label="Хүлээн авсан" />
        </footer>
      </article>
    </main>
  );
}

function InfoGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div>
      <h2 className="mb-3 font-bold">{title}</h2>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Signature({ label }: { label: string }) {
  return (
    <div className="border-t border-slate-500 pt-2">
      {label}: Нэр / гарын үсэг
    </div>
  );
}
