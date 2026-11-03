import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { createNomadPaymentRouter } from "./nomad-payment.routes";
import { parseNomadInvoice } from "./nomad-payment-page";

test("Nomad payment validates amounts, locks the recipient, renders safe bank links and reuses repeated submissions", async () => {
  let created = 0;
  let merchantCode = "MGL_STEPPE_1783745574293";
  const app = express();
  app.use("/pay", createNomadPaymentRouter({
    getMerchant: async () => ({ merchantCode, username: "test-user", password: "test-password" }),
    createInvoice: async (amount, reference, config) => {
      created++;
      assert.equal(amount, 12500);
      assert.equal(config.merchantCode, "MGL_STEPPE_1783745574293");
      assert.match(reference, /^[a-f0-9]{32}$/);
      return { invoiceId: "test-invoice", qrText: "test-payment-qr", urls: [
        { name: "Khan <bank>", link: "khanbank://q?qPay_QRcode=test-payment-qr" },
        { name: "Unsafe", link: "javascript:alert(1)" },
        { name: "Broken", link: "digipay://payment/null" },
      ] };
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pay/nomad`;
  const submit = (amount: string, requestId = randomUUID(), origin?: string) => fetch(endpoint, {
    method: "POST", body: new URLSearchParams({ amount, requestId }),
    headers: origin ? { origin } : undefined,
  });
  try {
    const page = await fetch(endpoint);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("cache-control"), "no-store");
    assert.match(page.headers.get("content-security-policy") || "", /form-action 'self'/);
    assert.match(await page.text(), /name="amount"/);
    for (const invalid of ["0", "-1", "1e3", "1.5", "100000001"]) {
      assert.equal((await submit(invalid)).status, 400, invalid);
    }
    assert.equal(created, 0);
    assert.equal((await submit("12500", randomUUID(), "https://other.example")).status, 403);
    assert.equal(created, 0);
    const requestId = randomUUID();
    const paidPage = await submit("12500", requestId);
    const html = await paidPage.text();
    assert.equal(paidPage.status, 200);
    assert.match(html, /<svg /);
    assert.match(html, /href="khanbank:\/\/q/);
    assert.match(html, /Khan &lt;bank&gt;/);
    assert.doesNotMatch(html, /javascript:|digipay:\/\/payment\/null|test-password|test-user/);
    // Browsers may omit the serialized origin under privacy/referrer policies.
    assert.equal((await submit("12500", requestId, "null")).status, 200);
    assert.equal(created, 1);
    assert.equal((await submit("10000", requestId)).status, 409);
    merchantCode = "OTHER_MERCHANT";
    const mismatch = await submit("12500");
    assert.equal(mismatch.status, 502);
    assert.doesNotMatch(await mismatch.text(), /OTHER_MERCHANT/);
    assert.equal(created, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("incomplete provider invoices are rejected", () => {
  for (const response of [null, {}, { invoiceId: "id", qrText: "", urls: [] }]) {
    assert.throws(() => parseNomadInvoice(response));
  }
});
