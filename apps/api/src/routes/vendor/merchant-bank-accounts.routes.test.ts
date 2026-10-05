import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@mgl/database';
import router from './vendor-merchant.routes';

let server: Server, url: string, writes = 0;
const restore: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restore.push(() => { Reflect.set(target, key, previous); });
}
const account = { account_bank_code: '050000', account_number: '1234567890', account_name: 'Owner', is_default: true };
function save(userId: string, organizationId: string, accounts: unknown = [account]) {
  const token = jwt.sign({ userId, role: 'USER' }, process.env.JWT_SECRET || 'dev-secret-change-me');
  return fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ organizationId, channel: 'POS', bank_accounts: accounts }) });
}
before(async () => {
  const app = express(); app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/vendor/merchant/bank-accounts`;
});
after(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });
afterEach(() => { while (restore.length) restore.pop()?.(); });
beforeEach(() => {
  writes = 0;
  stub(prisma.organization, "findUnique", async () => ({ name: "Company", qpayEnabled: false }));
  stub(prisma.organizationMember, 'findFirst', async ({ where }: { where: { userId: string; organizationId: string; role: string; isActive: boolean; deletedAt: null } }) => {
    assert.equal(where.role, 'OWNER'); assert.equal(where.isActive, true); assert.equal(where.deletedAt, null);
    return where.userId === 'owner' && where.organizationId === 'own-org' ? { organizationId: 'own-org' } : null;
  });
  stub(prisma.organization, 'update', async ({ where, data }: { where: { id: string }; data: { qpayBankAccounts: unknown; webQpayBankAccounts?: unknown } }) => {
    assert.equal(where.id, 'own-org'); assert.deepEqual(data.qpayBankAccounts, [account]); assert.equal(data.webQpayBankAccounts, undefined); writes++; return {};
  });
});
test('owner updates only the selected organization POS settlement accounts', async () => {
  assert.equal((await save('owner', 'own-org')).status, 200); assert.equal(writes, 1);
});
test('staff and owners of another organization cannot change settlement', async () => {
  assert.equal((await save('staff', 'own-org')).status, 403);
  assert.equal((await save('admin', 'own-org')).status, 403);
  assert.equal((await save('owner', 'other-org')).status, 403);
  assert.equal(writes, 0);
});
test('invalid bank data is rejected without mutation', async () => {
  assert.equal((await save('owner', 'own-org', [{ ...account, is_default: false }])).status, 400); assert.equal(writes, 0);
});

test('provider-managed settlement cannot be silently redirected by editing saved account fields', async () => {
  stub(prisma.organization, 'findUnique', async () => ({ name: 'Company', qpayEnabled: true, qpayMerchantId: 'merchant', qpayInvoiceCode: 'SYSTEMQR', qpayMerchantKey: 'systemqr' }));
  assert.equal((await save('owner', 'own-org')).status, 409);
  assert.equal(writes, 0);
});

function readAccounts(userId: string, organizationId: string, channel = 'POS') {
  const token = jwt.sign({ userId, role: 'USER' }, process.env.JWT_SECRET || 'dev-secret-change-me');
  return fetch(`${url}?${new URLSearchParams({ organizationId, channel })}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test('owner and admin read the selected channel; only owner can edit', async () => {
  stub(prisma.organizationMember, 'findFirst', async ({ where }: {
    where: { userId: string; organizationId: string; role: { in: string[] }; isActive: boolean; deletedAt: null; organization: { deletedAt: null } };
  }) => {
    assert.deepEqual(where.role.in, ['OWNER', 'ADMIN']);
    assert.equal(where.isActive, true);
    assert.equal(where.deletedAt, null);
    assert.equal(where.organization.deletedAt, null);
    return where.organizationId === 'own-org' && ['owner', 'admin'].includes(where.userId)
      ? { organizationId: 'own-org', role: where.userId.toUpperCase() } : null;
  });
  const webAccount = { ...account, account_number: '9876543210' };
  stub(prisma.organization, 'findUnique', async ({ where }: { where: { id: string } }) => {
    assert.equal(where.id, 'own-org');
    return { qpayBankAccounts: [account], webQpayBankAccounts: [webAccount] };
  });
  for (const user of ['owner', 'admin']) {
    for (const channel of ['POS', 'WEB']) {
      const response = await readAccounts(user, 'own-org', channel);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        success: true, canEdit: user === 'owner', bank_accounts: [channel === 'WEB' ? webAccount : account],
      });
    }
  }
  assert.equal((await readAccounts('staff', 'own-org')).status, 403);
  assert.equal((await readAccounts('owner', 'other-org')).status, 403);
  assert.equal(writes, 0);
});

test('database errors return failure instead of an empty successful account list', async () => {
  stub(prisma.organizationMember, 'findFirst', async () => { throw new Error('Database unavailable'); });
  assert.equal((await readAccounts('owner', 'own-org')).status, 500);
  assert.equal(writes, 0);
});
