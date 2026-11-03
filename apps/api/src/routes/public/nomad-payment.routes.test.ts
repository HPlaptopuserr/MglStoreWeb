import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { createNomadPaymentRouter, getNomadBankSelectionUrl } from "./nomad-payment.routes";

test("Nomad link opens QPay directly with the unchanged Minu QR and fixed merchant", async () => {
  let created = 0;
  let merchantCode = "MGL_STEPPE_1783745574293";
  const qrText = "0002010102125912Nomad Mongol6304ABCD";
  const app = express();
  app.use("/pay", createNomadPaymentRouter({
    getMerchant: async () => ({ merchantCode, username: "test-user", password: "test-password" }),
    createInvoice: async (amount, reference, config) => {
      created++;
      assert.equal(amount, 0);
      assert.equal(config.merchantCode, "MGL_STEPPE_1783745574293");
      assert.match(reference, /^[a-f0-9]{32}$/);
      return { invoiceId: "test-invoice", qrText };
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pay/nomad`;
  try {
    const response = await fetch(`${endpoint}?amount=999&merchantCode=OTHER`, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const destination = new URL(response.headers.get("location")!);
    assert.equal(destination.origin, "https://qpay.mn");
    assert.equal(destination.pathname, "/q/");
    assert.equal(destination.searchParams.get("q"), qrText);
    assert.doesNotMatch(await response.text(), /<form|test-user|test-password/);
    assert.equal(created, 1);
    const oldForm = await fetch(endpoint, { method: "POST", redirect: "manual" });
    assert.equal(oldForm.status, 303);
    assert.equal(oldForm.headers.get("location"), "/pay/nomad");
    assert.equal(created, 1);
    merchantCode = "OTHER_MERCHANT";
    const mismatch = await fetch(endpoint, { redirect: "manual" });
    assert.equal(mismatch.status, 502);
    assert.doesNotMatch(await mismatch.text(), /OTHER_MERCHANT|test-password/);
    assert.equal(created, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("incomplete or invalid provider QR cannot become a bank selection link", () => {
  for (const response of [null, {}, { invoiceId: "id", qrText: "" }, { invoiceId: "id", qrText: "https://other.example" }]) {
    assert.throws(() => getNomadBankSelectionUrl(response));
  }
});
