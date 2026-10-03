import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBusinessAppControlPatch } from './business-app-control-validation';

test('accepts independent POS, sales, settings and CEO changes', () => {
  for (const patch of [
    { features: { pos: false, sales: true } },
    { settings: { restrictSalesRepVendors: true } },
    { ceoService: { enabled: false }, maxMembers: 5 },
  ]) assert.equal(validateBusinessAppControlPatch(patch), null);
});

test('rejects coercible booleans, malformed groups, and unknown permissions', () => {
  for (const patch of [null, [], { features: null }, { features: [] },
    { features: { pos: 'false' } }, { features: { sales: 1 } },
    { settings: { attendanceManual: 'true' } }, { ceoService: { enabled: null } },
    { features: { managePlatform: true } }, { role: 'OWNER' },
    { maxMembers: '5' }, { maxMembers: 0 }, { maxMembers: 1.5 },
  ]) assert.notEqual(validateBusinessAppControlPatch(patch), null);
});
