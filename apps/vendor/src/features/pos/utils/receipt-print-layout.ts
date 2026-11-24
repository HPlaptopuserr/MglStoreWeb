import { receiptTaxTotal } from "./receipt-tax";
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
  QPAY: "Minu",
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
  const receiptTitle =
    receipt.status === "VOIDED" ? "БУЦААЛТЫН БАРИМТ" : "БОРЛУУЛАЛТЫН БАРИМТ";
  return `<article class="receipt">
    <header><h1>${escape(receipt.branchName)}</h1><p>${receiptTitle}</p></header>
    <section class="metadata">${pair("Баримт №", receipt.receiptNo)}${pair("Огноо", date)}${pair("Кассчин", receipt.registerName ? `${receipt.cashierName} · ${receipt.registerName}` : receipt.cashierName)}</section>
    <table><colgroup><col style="width:40%"><col style="width:12%"><col style="width:23%"><col style="width:25%"></colgroup><thead><tr><th>Бараа</th><th>Тоо</th><th>Үнэ</th><th>Дүн</th></tr></thead><tbody>${receipt.lines.map((line) => `<tr><td><b>${escape(line.name)}</b></td><td data-label="Тоо">${escape(formatPosQuantity(line.qty, line.measureUnit))}</td><td data-label="Үнэ">${money(line.unitPrice)}</td><td data-label="Дүн">${money(line.lineTotal)}</td></tr>`).join("")}</tbody></table>
    <section class="totals">${pair("Барааны дүн", money(receipt.subTotal))}${receipt.discountTotal ? pair("Хөнгөлөлт", `−${money(receipt.discountTotal)}`) : ""}${pair("Татвар", money(receiptTaxTotal(receipt)))}${pair("НИЙТ ДҮН", money(receipt.grandTotal), "grand-total")}</section>
    <section class="payments">${payments.map((item) => pair(paymentLabels[item.method] || item.method, money(item.amount)) + (item.method === "CASH" && item.cash ? pair("Авсан мөнгө", money(item.cash.receivedAmount)) + pair("Хариулт", money(item.cash.changeAmount)) : "")).join("")}</section>
    ${ebarimt?.status === "SUCCESS" ? `<section class="tax-info">${ebarimt.customerRegNo ? pair("Байгууллагын РД", ebarimt.customerRegNo) : ""}${ebarimt.customerTin ? pair("Байгууллагын TIN", ebarimt.customerTin) : ""}${ebarimt.lottery ? pair("Сугалаа", ebarimt.lottery) : ""}${ebarimt.billId || ebarimt.receiptId ? pair("ДДТД", ebarimt.billId || ebarimt.receiptId || "") : ""}</section>` : ""}
    </article>`;
}

export const receiptPrintCss = `
  body { font-family: Arial, sans-serif; font-size: 8.5pt; line-height: 1.2; }
  .receipt-document { width: 100%; min-width: 0; }
  .receipt header { text-align: center; margin-bottom: 2mm; padding: 1mm 0 1.5mm; border-bottom: 1px solid #111; }
  .receipt h1 { margin: 0; font-size: 15pt; overflow-wrap: anywhere; }
  .receipt header p { margin: .6mm 0 0; font-size: 8pt; font-weight: 700; letter-spacing: .3px; }
  .pair { display: flex; justify-content: space-between; gap: 2mm; margin: .6mm 0; }
  .pair strong { text-align: right; font-weight: 500; overflow-wrap: anywhere; min-width: 0; }
  .pair span { flex-shrink: 0; }
  .metadata { font-size: 8pt; padding-bottom: 1mm; }
  .receipt table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .receipt th { text-align: left; border-top: 1px dashed #444; border-bottom: 1px dashed #444; padding: 1mm 0; font-size: 8pt; }
  .receipt th:not(:first-child), .receipt td:not(:first-child) { text-align: right; font-size: 8pt; font-variant-numeric: tabular-nums; white-space: normal; overflow-wrap: anywhere; }
  .receipt td { border-bottom: 1px dotted #bbb; padding: 1.3mm 0; vertical-align: top; overflow-wrap: anywhere; }
  .receipt td:first-child { padding-right: 2mm; }
  .receipt th:nth-child(n+3), .receipt td:nth-child(n+3) { padding-left: .7mm; }
  .receipt .receipt-stacked-table colgroup, .receipt .receipt-stacked-table thead { display: none; }
  .receipt .receipt-stacked-table, .receipt-stacked-table tbody, .receipt-stacked-table tr, .receipt-stacked-table td { display: block; width: 100%; }
  .receipt .receipt-stacked-table tr { border-bottom: 1px dotted #bbb; padding: 1mm 0; }
  .receipt .receipt-stacked-table td { border: 0; padding: .4mm 0; }
  .receipt .receipt-stacked-table td:not(:first-child) { display: flex; justify-content: space-between; gap: 2mm; }
  .receipt-stacked-table td:not(:first-child)::before { content: attr(data-label); font-weight: 400; }
  .receipt small { display: block; margin-top: .5mm; font-size: 8pt; }
  .receipt tr { break-inside: avoid; }
  .totals, .payments, .tax-info { border-top: 1px dashed #444; padding-top: 1mm; margin-top: 1mm; }
  .grand-total { border-top: 1px solid #111; margin-top: 1mm; padding-top: 1mm; font-size: 12pt; font-weight: 700; }
  .grand-total strong { font-weight: 700; }
  .totals .pair, .payments .pair { flex-wrap: wrap; }
  .totals .pair strong, .payments .pair strong { white-space: nowrap; overflow-wrap: normal; flex-shrink: 0; margin-left: auto; }
  .totals .pair span, .payments .pair span { flex-shrink: 1; min-width: 0; }
  .ebarimt-qr, .receipt-thanks { break-inside: avoid; page-break-inside: avoid; }
  @media print { body[data-thermal-page-mode="receipt"] .receipt-document { break-inside: avoid; page-break-inside: avoid; } }
  .tax-info { font-size: 8pt; }
  .receipt-thanks { text-align: center; border-top: 1px dashed #444; padding: 4mm 0 1mm; margin-top: 4mm; font-family: Arial, sans-serif; }
  .receipt-thanks strong { display: block; font-size: 12pt; }
  .receipt-thanks p { margin: 1mm 0 0; font-size: 8pt; }

`;

export const receiptPrintFooter = `<footer class="receipt-thanks"><strong>Мөнгөө Монголдоо үлдээе</strong><p>Эм Жи Эл Стороор дахин үйлчлүүлээрэй!</p></footer>`;
