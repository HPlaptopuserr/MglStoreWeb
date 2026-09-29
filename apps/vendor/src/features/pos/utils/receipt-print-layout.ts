import type { PosReceipt } from "@mgl/types";
import { formatPosQuantity } from "@mgl/types";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
const money = (value: number) =>
  `₮${value.toLocaleString("mn-MN", { maximumFractionDigits: 2 })}`;
const paymentLabels: Record<string, string> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QPay",
  QR: "QR",
  CREDIT: "Зээл",
  MIXED: "Хосолсон",
};
const pair = (label: string, value: string, className = "") =>
  `<div class="pair ${className}"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;

export function receiptPrintLayout(receipt: PosReceipt) {
  const date = new Date(receipt.createdAt).toLocaleString("sv-SE", {
    timeZone: "Asia/Ulaanbaatar",
  });
  const payments = receipt.paymentBreakdown?.length
    ? receipt.paymentBreakdown
    : [{ method: receipt.paymentMethod, amount: receipt.grandTotal }];
  const ebarimt = receipt.ebarimt;
  return `<article class="receipt">
    <header><h1>${escape(receipt.branchName)}</h1><p>БОРЛУУЛАЛТЫН БАРИМТ</p>${receipt.status === "VOIDED" ? "<h2>БУЦААГДСАН</h2>" : ""}</header>
    <section class="metadata">${pair("Баримт №", receipt.receiptNo)}${pair("Огноо", date)}${pair("Кассчин", receipt.cashierName)}${receipt.registerName ? pair("Касс", receipt.registerName) : ""}</section>
    <table><colgroup><col style="width:40%"><col style="width:12%"><col style="width:23%"><col style="width:25%"></colgroup><thead><tr><th>Бараа</th><th>Тоо</th><th>Үнэ</th><th>Дүн</th></tr></thead><tbody>${receipt.lines.map((line) => `<tr><td><b>${escape(line.name)}</b></td><td>${escape(formatPosQuantity(line.qty, line.measureUnit))}</td><td>${money(line.unitPrice)}</td><td>${money(line.lineTotal)}</td></tr>`).join("")}</tbody></table>
    <section class="totals">${pair("Барааны дүн", money(receipt.subTotal))}${receipt.discountTotal ? pair("Хөнгөлөлт", `−${money(receipt.discountTotal)}`) : ""}${pair("Татвар", money(receipt.taxTotal))}${pair("НИЙТ ДҮН", money(receipt.grandTotal), "grand-total")}</section>
    <section class="payments">${payments.map((item) => pair(paymentLabels[item.method] || item.method, money(item.amount)) + (item.method === "CASH" && item.cash ? pair("Авсан мөнгө", money(item.cash.receivedAmount)) + pair("Хариулт", money(item.cash.changeAmount)) : "")).join("")}</section>
    ${ebarimt?.status === "SUCCESS" ? `<section class="tax-info">${ebarimt.customerRegNo ? pair("Байгууллагын РД", ebarimt.customerRegNo) : ""}${ebarimt.customerTin ? pair("Байгууллагын TIN", ebarimt.customerTin) : ""}${ebarimt.lottery ? pair("Сугалаа", ebarimt.lottery) : ""}${ebarimt.billId || ebarimt.receiptId ? pair("ДДТД", ebarimt.billId || ebarimt.receiptId || "") : ""}</section>` : ""}
    </article>`;
}

export const receiptPrintCss = `
  body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.4; }
  .receipt header { text-align: center; margin-bottom: 4mm; padding: 2mm 0 3mm; border-bottom: 2px solid #111; }
  .receipt h1 { margin: 0; font-size: 17pt; overflow-wrap: anywhere; }
  .receipt header p { margin: 1mm 0; font-size: 8pt; letter-spacing: .4px; }
  .pair { display: flex; justify-content: space-between; gap: 3mm; margin: 1mm 0; }
  .pair strong { text-align: right; font-weight: 500; overflow-wrap: anywhere; min-width: 0; }
  .pair span { flex-shrink: 0; }
  .metadata { font-size: 8pt; padding-bottom: 2mm; }
  .receipt table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .receipt th { text-align: left; border-top: 1px dashed #444; border-bottom: 1px dashed #444; padding: 2mm 0; font-size: 8pt; }
  .receipt th:not(:first-child), .receipt td:not(:first-child) { text-align: right; font-size: 8pt; font-variant-numeric: tabular-nums; }
  .receipt td { border-bottom: 1px dotted #bbb; padding: 2.5mm 0; vertical-align: top; overflow-wrap: anywhere; }
  .receipt td:first-child { padding-right: 2mm; }
  .receipt small { display: block; margin-top: .5mm; font-size: 8pt; }
  .receipt tr { break-inside: avoid; }
  .totals, .payments, .tax-info { border-top: 1px dashed #444; padding-top: 2mm; margin-top: 2mm; }
  .grand-total { border-top: 1px solid #111; margin-top: 2mm; padding-top: 2mm; font-size: 13pt; font-weight: 700; }
  .grand-total strong { font-weight: 700; }
  .tax-info { font-size: 8pt; }
  .receipt-thanks { text-align: center; border-top: 1px dashed #444; padding: 4mm 0 1mm; margin-top: 4mm; font-family: Arial, sans-serif; }
  .receipt-thanks strong { display: block; font-size: 12pt; }
  .receipt-thanks p { margin: 1mm 0 0; font-size: 8pt; }

`;

export const receiptPrintFooter = `<footer class="receipt-thanks"><strong>Баярлалаа!</strong><p>Та дахин үйлчлүүлээрэй.</p></footer>`;
