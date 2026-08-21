"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Landmark, Loader2, Printer } from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import {
  type Dispatch,
  formatMoney,
  paymentOutstanding,
  paymentStatusClass,
  paymentStatusLabel,
  type WarehousePaymentAccount,
} from "./dispatch-order.model";
import { CodeModeSelect, type ProductCodeMode } from "./CodeModeSelect";

export function InvoiceView({
  dispatch: d,
  onClose,
}: {
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const payment = d.request.payment;
  const [codeMode, setCodeMode] = useState<ProductCodeMode>("SKU");
  const [accounts, setAccounts] = useState<WarehousePaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? null;

  useEffect(() => {
    let active = true;
    const loadAccounts = async () => {
      setAccountsLoading(true);
      setAccountsError("");
      try {
        const response = await wmsFetch(`${API}/warehouses/payment-accounts`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            body.message || "Дансны мэдээлэл авахад алдаа гарлаа",
          );
        }
        const nextAccounts = Array.isArray(body.accounts)
          ? (body.accounts as WarehousePaymentAccount[])
          : [];
        if (!active) return;
        setAccounts(nextAccounts);
        const configuredAccountId = d.warehouse.paymentAccountId || "";
        setSelectedAccountId(
          nextAccounts.some((account) => account.id === configuredAccountId)
            ? configuredAccountId
            : nextAccounts[0]?.id || "",
        );
      } catch (error) {
        if (!active) return;
        setAccountsError(
          error instanceof Error
            ? error.message
            : "Дансны мэдээлэл авахад алдаа гарлаа",
        );
      } finally {
        if (active) setAccountsLoading(false);
      }
    };
    void loadAccounts();
    return () => {
      active = false;
    };
  }, [d.warehouse.paymentAccountId]);
  const totalQty = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity),
    0,
  );
  const computedTotal = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
    0,
  );
  const invoiceTotal = Number(payment?.totalAmount ?? computedTotal);
  const paidAmount = Number(payment?.paidAmount ?? 0);
  const outstanding = payment ? paymentOutstanding(payment) : invoiceTotal;
  const issuedAt = payment?.createdAt || d.createdAt;

  const handlePrint = () => {
    if (!selectedAccount) return;
    const printContent = document.getElementById(`invoice-content-${d.id}`);
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Нэхэмжлэх - ${payment?.invoiceNumber || d.dispatchNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 30px; font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; }
          .invoice-header { border-bottom: 3px double #334155; padding-bottom: 16px; margin-bottom: 20px; text-align: center; }
          .invoice-header h1 { margin: 0; font-size: 24px; }
          .invoice-header p { margin: 6px 0 0; color: #64748b; font-size: 13px; }
          .invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
          .invoice-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .invoice-label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .invoice-value { margin-top: 4px; font-size: 14px; font-weight: 700; }
          .invoice-sub { color: #64748b; font-size: 12px; margin-top: 3px; }
          .payment-account { margin: 18px 0; border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 8px; padding: 12px 14px; }
          .payment-account-title { color: #1d4ed8; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 7px; }
          .payment-account-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 18px; font-size: 13px; }
          .payment-account-grid strong { color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; }
          .text-right { text-align: right; }
          .summary { margin-top: 16px; margin-left: auto; width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .summary-row:last-child { border-bottom: 0; font-weight: 800; background: #f8fafc; }
          .footer { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
          .sig { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Нэхэмжлэх</h2>
          <p className="text-sm text-slate-500">
            {payment?.invoiceNumber || "Нэхэмжлэх үүсээгүй"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CodeModeSelect value={codeMode} onChange={setCodeMode} />
          {payment && (
            <div className="relative min-w-64">
              <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                aria-label="Нэхэмжлэхийн данс"
                value={selectedAccountId}
                disabled={accountsLoading || accounts.length === 0}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                {accountsLoading ? (
                  <option value="">Данс ачаалж байна...</option>
                ) : accounts.length === 0 ? (
                  <option value="">Данс тохируулаагүй</option>
                ) : (
                  accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} ·{" "}
                      {account.accountNumber || account.merchantCode}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          {payment && (
            <button
              onClick={handlePrint}
              disabled={!selectedAccount || accountsLoading}
              title={!selectedAccount ? "Хэвлэх дансаа сонгоно уу" : undefined}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {accountsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Хэвлэх
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Хаах
          </button>
        </div>
      </div>

      {!payment ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-amber-400" />
          <p className="font-semibold text-slate-700">
            Энэ илгээмжид нэхэмжлэх үүсээгүй байна
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Захиалга батлагдахад payment invoice үүссэн бол энд харагдана.
          </p>
        </div>
      ) : (
        <>
          {accountsError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {accountsError}
            </div>
          )}
          {!accountsLoading && accounts.length === 0 && !accountsError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Тохиргоо хэсэгт нэхэмжлэхийн төлбөр хүлээн авах дансаа сонгоно уу.
            </div>
          )}
          <div
            id={`invoice-content-${d.id}`}
            className="rounded-lg border border-slate-200 bg-white p-6"
          >
            <div className="invoice-header border-b-2 border-double border-slate-300 pb-4 text-center">
              <h1 className="text-2xl font-bold text-slate-800">НЭХЭМЖЛЭХ</h1>
              <p className="mt-1 text-sm text-slate-500">
                {payment.invoiceNumber} • {d.request.requestNumber} •{" "}
                {new Date(issuedAt).toLocaleDateString("mn-MN")}
              </p>
            </div>

            {selectedAccount && (
              <div className="payment-account my-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="payment-account-title mb-2 text-[11px] font-bold uppercase text-blue-700">
                  Төлбөр шилжүүлэх данс
                </p>
                <div className="payment-account-grid grid grid-cols-2 gap-x-5 gap-y-1 text-sm text-slate-700">
                  <div>
                    <strong>Банк:</strong> {selectedAccount.bankName}
                  </div>
                  <div>
                    <strong>Данс:</strong>{" "}
                    {selectedAccount.accountNumber ||
                      selectedAccount.merchantCode}
                  </div>
                  <div>
                    <strong>Эзэмшигч:</strong> {selectedAccount.accountHolder}
                  </div>
                  {selectedAccount.registerNumber && (
                    <div>
                      <strong>Регистр:</strong> {selectedAccount.registerNumber}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="invoice-grid mt-5 grid grid-cols-2 gap-4">
              <div className="invoice-box rounded-lg border border-slate-200 p-3">
                <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                  Нэхэмжлэгч
                </p>
                <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                  {d.warehouse.name}
                </p>
                {d.warehouse.address && (
                  <p className="invoice-sub text-xs text-slate-500">
                    {d.warehouse.address}
                  </p>
                )}
              </div>
              <div className="invoice-box rounded-lg border border-slate-200 p-3">
                <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                  Худалдан авагч
                </p>
                <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                  {d.request.organization.name}
                </p>
                {d.request.deliveryAddress && (
                  <p className="invoice-sub text-xs text-slate-500">
                    {d.request.deliveryAddress}
                  </p>
                )}
              </div>
              <div className="invoice-box rounded-lg border border-slate-200 p-3">
                <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                  Төлөв
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${paymentStatusClass(
                    payment.status,
                  )}`}
                >
                  {paymentStatusLabel(payment.status)}
                </span>
                {payment.paidAt && (
                  <p className="invoice-sub text-xs text-slate-500">
                    Төлсөн: {new Date(payment.paidAt).toLocaleString("mn-MN")}
                  </p>
                )}
                {payment.dueDate && (
                  <p className="invoice-sub text-xs text-slate-500">
                    Төлөх хугацаа:{" "}
                    {new Date(payment.dueDate).toLocaleDateString("mn-MN")}
                  </p>
                )}
              </div>
              <div className="invoice-box rounded-lg border border-slate-200 p-3">
                <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                  Илгээмж
                </p>
                <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                  {d.dispatchNumber}
                </p>
                {payment.transactionId && (
                  <p className="invoice-sub text-xs text-slate-500">
                    Гүйлгээ: {payment.transactionId}
                  </p>
                )}
              </div>
            </div>

            <table className="mt-5 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left">
                    №
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left">
                    Бүтээгдэхүүн
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-left">
                    {codeMode === "SKU" ? "SKU" : "Баркод"}
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-right">
                    Тоо
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-right">
                    Нэгж үнэ
                  </th>
                  <th className="border border-slate-300 px-3 py-2 text-right">
                    Дүн
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.request.items.map((item, idx) => {
                  const qty = item.approvedQuantity || item.quantity;
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-300 px-3 py-2">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 font-medium">
                        {item.product.name}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-500">
                        {codeMode === "SKU"
                          ? item.product.sku || "-"
                          : item.product.barcode || item.product.sku || "-"}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                        {qty}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right">
                        {formatMoney(item.product.price)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                        {formatMoney(qty * Number(item.product.price))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="summary mt-4 ml-auto w-full max-w-xs overflow-hidden rounded-lg border border-slate-200">
              <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
                <span>Нийт тоо</span>
                <span className="font-semibold">{totalQty} ш</span>
              </div>
              <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
                <span>Нэхэмжилсэн</span>
                <span className="font-semibold">
                  {formatMoney(invoiceTotal)}
                </span>
              </div>
              <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
                <span>Төлсөн</span>
                <span className="font-semibold">{formatMoney(paidAmount)}</span>
              </div>
              <div className="summary-row flex justify-between bg-slate-50 px-3 py-2 text-sm font-bold">
                <span>Үлдэгдэл</span>
                <span>{formatMoney(outstanding)}</span>
              </div>
            </div>

            {payment.note && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Тэмдэглэл:</strong> {payment.note}
              </div>
            )}

            <div className="footer mt-10 grid grid-cols-2 gap-10">
              <div className="sig border-t border-slate-400 pt-2 text-center text-xs text-slate-500">
                Нэхэмжлэх гаргасан
              </div>
              <div className="sig border-t border-slate-400 pt-2 text-center text-xs text-slate-500">
                Хүлээн авсан
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
