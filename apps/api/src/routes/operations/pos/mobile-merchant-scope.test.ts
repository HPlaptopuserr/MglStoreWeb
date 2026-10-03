import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@mgl/database';
import router from './qpay.routes';
import { JWT_SECRET } from './_shared';

let server: Server, url: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, replacement: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  restores.push(() => { Reflect.set(target, key, previous); });
}
const requestId = '12345678-1234-4234-8234-123456789012';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ userId: 'owner', organizationId: 'org' }, JWT_SECRET)}` };
before(async () => {
  const app = express(); app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/pos/payments/systemqr/invoice`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
afterEach(() => { while (restores.length) restores.pop()?.(); });
beforeEach(() => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'owner', role: 'USER', isActive: true, deletedAt: null }));
  stub(prisma.organizationMember, 'findFirst', async () => ({ organizationId: 'org', role: 'OWNER', capabilities: [] }));
  stub(prisma.organizationMember, 'count', async () => 1);
  stub(prisma.organization, 'findUnique', async () => ({ businessPosEnabled: true, qpayEnabled: false, qpayMerchantId: null }));
  stub(prisma.posRegister, 'findUnique', async () => ({ id: 'register', organizationId: 'org', isActive: true, activationStatus: 'APPROVED', qpayEnabled: true, qpayMerchantId: 'other-merchant', qpayTerminalId: 'SYSTEMQR' }));
  stub(prisma.qPayInvoice, 'findUnique', async () => null);
  stub(prisma.qPayInvoice, 'create', async () => { throw new Error('Invoice must not be created without an organization merchant'); });
});
test('mobile cannot fall back to a register merchant when the owner has no organization setup', async () => {
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ amount: 1000, organizationId: 'org', registerId: 'register', requestId, merchantScope: 'ORGANIZATION' }) });
  assert.equal(response.status, 400);
});
test('existing requests remain recoverable without resolving new merchant settings', async () => {
  stub(prisma.qPayInvoice, 'findUnique', async () => ({ id: requestId, organizationId: 'org', registerId: 'register', amount: 1000, status: 'PAID', qrText: 'qr', expiresAt: new Date(), createdAt: new Date(), webhookPayload: {} }));
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ amount: 1000, organizationId: 'org', registerId: 'register', requestId, merchantScope: 'ORGANIZATION' }) });
  assert.equal(response.status, 200);
  const result = await response.json() as { invoiceId: string; status: string };
  assert.equal(result.invoiceId, requestId);
  assert.equal(result.status, 'PAID');
});

test('Minu endpoint refuses QPay configuration instead of falling back', async () => {
  stub(prisma.organization, 'findUnique', async () => ({ businessPosEnabled: true, qpayEnabled: true, qpayMerchantId: 'qpay-merchant', qpayMerchantKey: 'qpay-secret', qpayInvoiceCode: 'QPAY_CODE' }));
  const response = await fetch(url.replace('/qpay/', '/systemqr/'), { method: 'POST', headers, body: JSON.stringify({ amount: 1000, organizationId: 'org', registerId: 'register', requestId }) });
  assert.equal(response.status, 400);
  const result = await response.json() as { message: string };
  assert.match(result.message, /Minu/);
});

test('Minu endpoint creates with the organization merchant, never the register or QPay', async () => {
  stub(prisma.organization, 'findUnique', async () => ({ name: 'Owner store', businessPosEnabled: true, qpayEnabled: true, qpayMerchantId: 'owner-minu', qpayMerchantKey: 'systemqr', qpayInvoiceCode: 'SYSTEMQR' }));
  stub(process.env, 'SYSTEMQR_USERNAME', 'unit-test-master');
  stub(process.env, 'SYSTEMQR_PASSWORD', 'unit-test-password');
  const invoice = { id: requestId, organizationId: 'org', registerId: 'register', amount: 1000, status: 'PENDING', expiresAt: new Date(), createdAt: new Date() };
  stub(prisma.qPayInvoice, 'create', async ({ data }: { data: { webhookPayload: { provider: string; merchantCode: string } } }) => {
    assert.equal(data.webhookPayload.provider, 'SYSTEMQR');
    assert.equal(data.webhookPayload.merchantCode, 'owner-minu');
    return invoice;
  });
  stub(prisma.qPayInvoice, 'update', async ({ data }: { data: { qrText: string; webhookPayload: { provider: string; merchantCode: string; merchantScope: string } } }) => {
    assert.equal(data.webhookPayload.provider, 'SYSTEMQR');
    assert.equal(data.webhookPayload.merchantCode, 'owner-minu');
    assert.equal(data.webhookPayload.merchantScope, 'ORGANIZATION');
    return { ...invoice, ...data };
  });
  stub(prisma.auditLog, 'create', async () => ({}));
  const realFetch = globalThis.fetch;
  let providerCalls = 0;
  stub(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const target = String(input);
    if (target.startsWith('http://127.0.0.1:')) return realFetch(input, init);
    if (target.endsWith('/login')) return Response.json({ status: '000', entity: 'test-minu-token' });
    assert.ok(target.endsWith('/subMerchant/createInvoice'), `Unexpected provider call: ${target}`);
    const body = JSON.parse(String(init?.body)) as { merchantCode: string; amount: number };
    assert.equal(body.merchantCode, 'owner-minu');
    assert.equal(body.amount, 1000);
    providerCalls++;
    return Response.json({ status: '000', entity: { invoiceNumber: 'minu-invoice', mainQr: 'minu-qr', deeplinkList: [] } });
  });
  const response = await fetch(url.replace('/qpay/', '/systemqr/'), { method: 'POST', headers, body: JSON.stringify({ amount: 1000, organizationId: 'org', registerId: 'register', requestId }) });
  assert.equal(response.status, 201);
  assert.equal(providerCalls, 1);
  const result = await response.json() as { qrText: string };
  assert.equal(result.qrText, 'minu-qr');
});
