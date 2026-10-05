import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./merchant-diagnostics.routes";
import type { MerchantDiagnostics } from "@mgl/types";

let server: Server;
let url: string;
const restore: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restore.push(() => { Reflect.set(target, key, previous); });
}
function headers(role: string) {
  return { Authorization: `Bearer ${jwt.sign({ userId: "actor", role }, process.env.JWT_SECRET || "dev-secret-change-me")}` };
}
before(async () => {
  const app = express(); app.use(router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  url = `http://127.0.0.1:${address.port}/admin/organizations/org/merchant-diagnostics`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
afterEach(() => { while (restore.length) restore.pop()?.(); });

test("merchant diagnostics require platform organization permission, not organization admin membership", async () => {
  let reads = 0;
  stub(prisma.organization, "findFirst", async () => { reads++; return null; });
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: headers("USER") })).status, 403);
  assert.equal((await fetch(url, { headers: headers("HR_ADMIN") })).status, 403);
  assert.equal(reads, 0);
});

test("diagnostics separate POS/WEB, redact credentials and never claim provider verification", async () => {
  stub(prisma.organization, "findFirst", async ({ where }: { where: { id: string; deletedAt: null } }) => {
    assert.deepEqual(where, { id: "org", deletedAt: null });
    return { qpayEnabled: true, qpayMerchantId: "pos-merchant", qpayMerchantKey: "systemqr:secret-pos", qpayInvoiceCode: "SYSTEMQR", qpayConnectedAt: new Date("2026-09-01T00:00:00Z"), qpayBankAccounts: [{ account_bank_code: "320000", account_number: "1234567890", account_name: "Owner", is_default: true, secret: "omit" }], webQpayEnabled: false, webQpayMerchantId: "web-merchant", webQpayMerchantKey: "secret-web", webQpayInvoiceCode: "PRIVATE_INVOICE", webQpayConnectedAt: null, webQpayBankAccounts: null };
  });
  stub(prisma.auditLog, "findMany", async ({ where }: { where: { meta: { path: string[]; equals: string } } }) => {
    assert.deepEqual(where.meta, { path: ["organizationId"], equals: "org" });
    return [{ id: "audit", createdAt: new Date("2026-10-05T00:00:00Z"), meta: { channel: "POS", event: "CONNECTED", secret: "omit" }, user: { email: "owner@example.invalid" } }];
  });
  const response = await fetch(url, { headers: headers("ADMIN") });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const raw = await response.text();
  assert.ok(!/secret-pos|secret-web|PRIVATE_INVOICE|omit/.test(raw));
  const data: MerchantDiagnostics = JSON.parse(raw);
  assert.deepEqual(data.channels.map((channel) => [channel.channel, channel.provider, channel.connected, channel.providerVerification]), [["POS", "MINU", true, "NOT_VERIFIED"], ["WEB", "QPAY", false, "NOT_VERIFIED"]]);
  assert.equal(data.channels[0]?.accounts[0]?.number, "1234567890");
  assert.deepEqual(data.channels[1]?.accounts, []);
  assert.equal(data.history[0]?.actor, "owner@example.invalid");
});

test("missing organizations and unavailable diagnostics are not successful empty states", async () => {
  stub(prisma.organization, "findFirst", async () => null);
  assert.equal((await fetch(url, { headers: headers("ADMIN") })).status, 404);
  stub(prisma.organization, "findFirst", async () => { throw new Error("private connection string"); });
  const response = await fetch(url, { headers: headers("ADMIN") });
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("private connection string"));
});
