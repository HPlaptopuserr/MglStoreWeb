import { randomUUID } from "node:crypto";

export interface NomadPaymentInvoice {
  invoiceId: string;
  qrText: string;
  banks: Array<{ name: string; link: string }>;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);

const bankSchemes = new Set([
  "khanbank:", "tdbbank:", "xacbank:", "statebank:", "most:", "ckbank:",
  "arig:", "arigbank:", "capitronbank:", "bogdbank:", "transbank:",
  "monpay:", "socialpay-payment:", "toki:", "mbank:", "qpaywallet:",
  "qpay:", "digipay:", "ubcitybank:", "chpos:", "nationalinvestmentbank:",
]);

export function parseNomadInvoice(value: unknown): NomadPaymentInvoice {
  if (!value || typeof value !== "object") throw new Error("Incomplete invoice");
  const record = value as Record<string, unknown>;
  if (typeof record.invoiceId !== "string" || !record.invoiceId ||
      typeof record.qrText !== "string" || !record.qrText || !Array.isArray(record.urls)) {
    throw new Error("Incomplete invoice");
  }
  const banks: NomadPaymentInvoice["banks"] = [];
  for (const item of record.urls) {
    if (!item || typeof item !== "object") continue;
    const bank = item as Record<string, unknown>;
    if (typeof bank.name !== "string" || typeof bank.link !== "string" ||
        /null|undefined/i.test(bank.link)) continue;
    try {
      if (bankSchemes.has(new URL(bank.link).protocol)) {
        banks.push({ name: bank.name, link: bank.link });
      }
    } catch { /* An invalid provider link must never become a payment button. */ }
  }
  return { invoiceId: record.invoiceId, qrText: record.qrText, banks };
}

export function renderNomadPaymentPage(options: {
  nonce: string;
  amount?: number;
  invoice?: NomadPaymentInvoice;
  qrSvg?: string;
  error?: string;
}): string {
  const { nonce, amount, invoice, qrSvg, error } = options;
  const formattedAmount = amount?.toLocaleString("mn-MN");
  return `<!doctype html>
<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Nomad Mongol · Төлбөр</title>
<style nonce="${escapeHtml(nonce)}">
*{box-sizing:border-box}body{margin:0;background:#f4f6f5;color:#142621;font:16px/1.6 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:760px;margin:48px auto;padding:0 20px}.brand{display:flex;align-items:center;gap:14px;margin-bottom:28px}.mark{display:grid;place-items:center;background:#174f40;color:white;border-radius:16px;width:54px;height:54px;font-size:26px;font-weight:750}.brand strong{font-size:22px}.muted{color:#5d6f67;font-size:14px}h1{font-size:28px;line-height:1.3;margin:0 0 12px}h2{font-size:19px;margin:0 0 14px}.card{background:white;border:1px solid #dfe8e3;border-radius:24px;padding:28px;margin-bottom:20px}p{margin:0 0 20px}label{display:block;font-weight:650;margin-bottom:8px}.input{display:flex;align-items:center;border:1px solid #a6b9af;border-radius:12px;padding-right:16px;background:#fff}input[type=text]{width:100%;border:0;background:transparent;padding:15px;font:inherit;font-size:24px;color:inherit;min-width:0}input:focus{outline:0}.input:focus-within{outline:3px solid #91c6b2;outline-offset:2px}button,.bank{min-height:50px;border-radius:12px;font:inherit;font-weight:650;text-align:center}button{width:100%;background:#174f40;color:white;border:0;padding:14px;margin-top:18px;cursor:pointer}button:hover{background:#103d31}button:focus-visible,a:focus-visible{outline:3px solid #438d70;outline-offset:3px}.banks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.bank{display:flex;align-items:center;justify-content:center;text-decoration:none;color:#174f40;border:1px solid #cbdcd2;padding:10px;overflow-wrap:anywhere}.bank:hover{background:#edf6f0}.amount{font-size:36px;font-weight:750;line-height:1.3;margin-bottom:8px}.payment{display:grid;grid-template-columns:240px 1fr;gap:28px}.qr{background:white;border:1px solid #e1e8e3;border-radius:16px;padding:12px}.qr svg{display:block;width:100%;height:auto}.error{padding:14px 16px;background:#fff0ec;color:#9b3324;border-radius:12px;margin-bottom:20px}.note{margin:20px 0 0}.reference{overflow-wrap:anywhere;font-size:12px;color:#718379;margin-top:10px}.change{display:inline-block;margin-top:18px;color:#174f40}.footer{text-align:center;color:#718379;font-size:13px;margin:24px 0 40px}@media(max-width:600px){main{margin-top:24px}.card{padding:22px}.payment{grid-template-columns:1fr}.qr{max-width:260px;margin:auto}.brand strong{font-size:20px}h1{font-size:25px}}
</style></head><body><main>
<header class="brand"><span class="mark" aria-hidden="true">N</span><div><strong>Nomad Mongol</strong><div class="muted">Төлбөр төлөх</div></div></header>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
${invoice ? `<section class="card"><div class="muted">Nomad Mongol-д төлөх дүн</div><div class="amount">${escapeHtml(formattedAmount || "")} ₮</div><p class="muted">Банкаа сонгох эсвэл банкны апп-аараа QR уншуулаарай.</p>
<div class="payment"><div><div class="qr" role="img" aria-label="Nomad Mongol, ${escapeHtml(formattedAmount || "")} төгрөгийн төлбөрийн QR">${qrSvg || ""}</div><div class="reference">Нэхэмжлэл: ${escapeHtml(invoice.invoiceId)}</div></div>
<div><h1>Банкаа сонгоно уу</h1><div class="banks">${invoice.banks.map((bank) => `<a class="bank" href="${escapeHtml(bank.link)}">${escapeHtml(bank.name)}</a>`).join("")}</div></div></div>
<p class="muted note">Утсан дээрээ банк сонгоход тухайн банкны апп нээгдэнэ. Хүлээн авагч болон дүнгээ банкны апп дээр шалгаж, төлбөрөө баталгаажуулна уу.</p><a class="change" href="/pay/nomad">Өөр дүн оруулах</a></section>` : `<section class="card"><h1>Төлбөрийн дүнгээ оруулна уу</h1><p class="muted">Nomad Mongol-ийн төлбөр хүлээн авах дансанд төлнө.</p>
<form method="post" action="/pay/nomad"><input type="hidden" name="requestId" value="${randomUUID()}"><label for="amount">Төлөх дүн</label><div class="input"><input id="amount" name="amount" type="text" inputmode="numeric" pattern="[0-9]+" maxlength="9" autocomplete="off" placeholder="0" required aria-describedby="amount-help" value="${amount ?? ""}"><span>₮</span></div><div id="amount-help" class="muted">1–100,000,000 төгрөг</div><button type="submit">Банк болон QR харуулах</button></form></section>`}
<footer class="footer">Minu · Банкны апп-аар төлбөрөө баталгаажуулна.</footer></main></body></html>`;
}
