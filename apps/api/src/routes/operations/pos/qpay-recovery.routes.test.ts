import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./qpay.routes";
import { JWT_SECRET } from "./_shared";

let server: Server;
let base: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, replacement: unknown): void {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => { Reflect.set(target, key, previous); });
}
const headers = { Authorization: `Bearer ${jwt.sign({ userId: "owner", organizationId: "org" }, JWT_SECRET)}` };
const checkout = { clientSaleId: "basket", branchId: "branch", shiftId: "shift", lines: [{ productId: "product", qty: 1, unitPrice: 8300 }] };
const invoice = {
  id: "original-invoice", amount: 8300, status: "EXPIRED", qrText: "original-qr", paidAt: null,
  expiresAt: new Date("2026-11-21T05:00:00Z"), createdAt: new Date("2026-11-21T04:55:00Z"),
  webhookPayload: { provider: "SYSTEMQR", checkout, merchantKey: "NEVER-RETURN-SECRET", providerCancellationConfirmed: false, checkoutAbandonedAt: "legacy-mistake", qrImage: "image" },
};
before(async () => {
  const app = express(); app.use(router);
  server = await new Promise<Server>(resolve => { const started = app.listen(0, "127.0.0.1", () => resolve(started)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/payments/qpay/recovery`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  stub(prisma.user, "findUnique", async () => ({ id: "owner", role: "USER", isActive: true, deletedAt: null }));
  stub(prisma.organizationMember, "findFirst", async () => ({ organizationId: "org", role: "OWNER", capabilities: [] }));
  stub(prisma.organizationMember, "count", async () => 1);
  stub(prisma.posRegister, "findUnique", async () => ({ organizationId: "org" }));
  stub(prisma.qPayInvoice, "findMany", async (args: unknown) => {
    assert.deepEqual(args, { where: { organizationId: "org", registerId: "register", consumedAt: null,
      status: { in: ["PENDING", "EXPIRED", "PAID"] }, webhookPayload: { path: ["checkout", "clientSaleId"], equals: "basket" },
    }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    return [invoice];
  });
});

test("recovery returns original bank evidence and basket without exposing provider credentials", async () => {
  const response = await fetch(`${base}?registerId=register&clientSaleId=basket`, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const raw = await response.text();
  assert.ok(!raw.includes("NEVER-RETURN-SECRET"));
  const result = JSON.parse(raw) as { invoices: Array<{ invoiceId: string; amount: number; status: string; providerCancellationConfirmed: boolean; checkout: typeof checkout }> };
  assert.equal(result.invoices[0].invoiceId, "original-invoice");
  assert.equal(result.invoices[0].amount, 8300);
  assert.equal(result.invoices[0].status, "EXPIRED");
  assert.equal(result.invoices[0].providerCancellationConfirmed, false);
  assert.equal(result.invoices[0].checkout.clientSaleId, "basket");
});

test("explicit cancelled QR is omitted but a proved paid QR remains recoverable", async () => {
  stub(prisma.qPayInvoice, "findMany", async () => [
    { ...invoice, id: "cancelled", webhookPayload: { ...invoice.webhookPayload, providerCancellationConfirmed: true } },
    { ...invoice, id: "paid", status: "PAID", webhookPayload: { ...invoice.webhookPayload, providerCancellationConfirmed: true } },
  ]);
  const result = await (await fetch(`${base}?registerId=register&clientSaleId=basket`, { headers })).json() as { invoices: Array<{ invoiceId: string }> };
  assert.deepEqual(result.invoices.map(item => item.invoiceId), ["paid"]);
});

test("recovery rejects missing scope and foreign organization access", async () => {
  assert.equal((await fetch(`${base}?registerId=register`, { headers })).status, 400);
  stub(prisma.organizationMember, "count", async () => 0);
  assert.equal((await fetch(`${base}?registerId=register&clientSaleId=basket`, { headers })).status, 403);
});

test("status polling returns only explicit stored cancellation proof", async () => {
  for (const proof of [true, false, undefined] as const) {
    stub(prisma.qPayInvoice, "findUnique", async () => ({ ...invoice, organizationId: "org", register: null,
      webhookPayload: { providerInvoiceId: "bank-reference", cancelledAt: "a timestamp alone is not proof",
        ...(proof !== undefined ? { providerCancellationConfirmed: proof } : {}) },
    }));
    const response = await fetch(base.replace("/recovery", "/status/original-invoice?refresh=0"), { headers });
    assert.equal(response.status, 200);
    const result = await response.json() as { providerCancellationConfirmed?: boolean };
    if (proof === undefined) assert.equal("providerCancellationConfirmed" in result, false);
    else assert.equal(result.providerCancellationConfirmed, proof);
  }
});
